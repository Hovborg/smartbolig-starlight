import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(import.meta.dirname, '..');
const dailyScript = path.join(rootDir, 'scripts', 'openclaw-ai-news-daily.sh');

// Regression for the 2026-07-18 incident: the daily job stopped comfyui.service
// while another caller held a GPU token, which killed a running LTX video
// render. The job must take a queue token like every other GPU caller and must
// never stop the service while the queue reports the GPU held.
async function runStopComfyui({ health, healthFails = false }) {
  const tmp = await mkdtemp(path.join(tmpdir(), 'smartbolig-gpu-queue-'));
  const callsFile = path.join(tmp, 'calls.jsonl');
  const binDir = path.join(tmp, 'bin');
  await execFileAsync('mkdir', ['-p', binDir]);

  // Fake curl: records the request and answers /health from the test case.
  await writeFile(path.join(binDir, 'curl'), `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
const url = args.find((a) => a.startsWith('http')) || '';
fs.appendFileSync(process.env.SMARTBOLIG_FAKE_CALLS, JSON.stringify(['curl', url]) + '\\n');
if (url.endsWith('/health')) {
  if (${healthFails ? 'true' : 'false'}) process.exit(7);
  process.stdout.write(${JSON.stringify(JSON.stringify(health ?? {}))});
  process.exit(0);
}
process.stdout.write('{"ok":true}');
process.exit(0);
`);
  await chmod(path.join(binDir, 'curl'), 0o755);

  // Fake systemctl: reports the service active and records every call.
  await writeFile(path.join(binDir, 'systemctl'), `#!/usr/bin/env node
const fs = require('node:fs');
fs.appendFileSync(process.env.SMARTBOLIG_FAKE_CALLS, JSON.stringify(['systemctl', ...process.argv.slice(2)]) + '\\n');
process.exit(0);
`);
  await chmod(path.join(binDir, 'systemctl'), 0o755);

  await execFileAsync('bash', [
    '-c',
    `source ${JSON.stringify(dailyScript)}; GPU_TOKEN=test-token; stop_comfyui`,
  ], {
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      SMARTBOLIG_FAKE_CALLS: callsFile,
    },
  });

  const calls = (await readFile(callsFile, 'utf8'))
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  await rm(tmp, { recursive: true, force: true });
  return calls;
}

test('stop_comfyui releases its token and leaves the service running while another caller holds the GPU', async () => {
  const calls = await runStopComfyui({ health: { gpu_locked: true, holder_registered: false } });

  assert.ok(
    calls.some(([bin, url]) => bin === 'curl' && url.endsWith('/gpu/release')),
    'the job must release its own token first, otherwise it only ever sees its own hold',
  );
  assert.ok(
    !calls.some(([bin, ...args]) => bin === 'systemctl' && args.includes('stop')),
    'comfyui.service must not be stopped while the queue reports the GPU locked',
  );
});

test('stop_comfyui leaves the service running when a holder is registered', async () => {
  const calls = await runStopComfyui({ health: { gpu_locked: false, holder_registered: true } });

  assert.ok(!calls.some(([bin, ...args]) => bin === 'systemctl' && args.includes('stop')));
});

test('stop_comfyui leaves the service running when the GPU queue is unreachable', async () => {
  const calls = await runStopComfyui({ healthFails: true });

  assert.ok(
    !calls.some(([bin, ...args]) => bin === 'systemctl' && args.includes('stop')),
    'an unreachable queue must count as busy rather than as free',
  );
});

test('stop_comfyui stops the service when the queue reports the GPU free', async () => {
  const calls = await runStopComfyui({ health: { gpu_locked: false, holder_registered: false } });

  assert.ok(
    calls.some(([bin, url]) => bin === 'curl' && url.endsWith('/gpu/release')),
    'the token is released before the free/busy check',
  );
  assert.ok(
    calls.some(([bin, ...args]) => bin === 'systemctl' && args.includes('stop')),
    'a free GPU should still hand back the VRAM',
  );
});
