import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(import.meta.dirname, '..');

test('systemd AI News timer installer writes correct units and disables the legacy OpenClaw job', async () => {
  const tmp = await mkdtemp(path.join(tmpdir(), 'smartbolig-ai-news-timer-'));
  const unitDir = path.join(tmp, 'units');
  const callsFile = path.join(tmp, 'calls.jsonl');

  // Fake systemctl that records its arguments.
  const fakeSystemctl = path.join(tmp, 'systemctl');
  await writeFile(fakeSystemctl, `#!/usr/bin/env node
const fs = require('node:fs');
fs.appendFileSync(process.env.SMARTBOLIG_FAKE_CALLS, JSON.stringify(['systemctl', ...process.argv.slice(2)]) + '\\n');
process.exit(0);
`);
  await chmod(fakeSystemctl, 0o755);

  // Fake openclaw that reports one enabled legacy job and records calls.
  const fakeOpenclaw = path.join(tmp, 'openclaw');
  await writeFile(fakeOpenclaw, `#!/usr/bin/env node
const fs = require('node:fs');
fs.appendFileSync(process.env.SMARTBOLIG_FAKE_CALLS, JSON.stringify(['openclaw', ...process.argv.slice(2)]) + '\\n');
const args = process.argv.slice(2);
if (args.join(' ') === 'cron list --all --json') {
  console.log(JSON.stringify({ jobs: [{ id: 'legacy-job-id', name: 'smartbolig-ai-news-daily', enabled: true }] }));
  process.exit(0);
}
if (args[0] === 'cron' && args[1] === 'disable') process.exit(0);
console.error('unexpected openclaw call', args.join(' '));
process.exit(2);
`);
  await chmod(fakeOpenclaw, 0o755);

  try {
    await execFileAsync('bash', ['scripts/install-systemd-ai-news-timer.sh'], {
      cwd: rootDir,
      env: {
        ...process.env,
        PATH: `${tmp}:${process.env.PATH}`,
        SMARTBOLIG_FAKE_CALLS: callsFile,
        SMARTBOLIG_AI_NEWS_UNIT_DIR: unitDir,
        SMARTBOLIG_AI_NEWS_SYSTEMCTL: fakeSystemctl,
      },
    });

    // All three units must exist.
    const servicePath = path.join(unitDir, 'smartbolig-ai-news.service');
    const failurePath = path.join(unitDir, 'smartbolig-ai-news-failure.service');
    const timerPath = path.join(unitDir, 'smartbolig-ai-news.timer');
    assert.ok(existsSync(servicePath), 'expected main service unit to be written');
    assert.ok(existsSync(failurePath), 'expected failure service unit to be written');
    assert.ok(existsSync(timerPath), 'expected timer unit to be written');

    // The main service must run the daily runner and notify on failure.
    const service = await readFile(servicePath, 'utf8');
    assert.match(service, /ExecStart=.*scripts\/openclaw-ai-news-daily\.sh/);
    assert.match(service, /OnFailure=smartbolig-ai-news-failure\.service/);
    assert.match(service, /Type=oneshot/);

    // The failure service must run the GitHub-issue notifier.
    const failure = await readFile(failurePath, 'utf8');
    assert.match(failure, /ExecStart=.*scripts\/ai-news-failure-notify\.sh/);

    // The timer must be daily, persistent, and installable.
    const timer = await readFile(timerPath, 'utf8');
    assert.match(timer, /OnCalendar=\*-\*-\* 07:20:00/);
    assert.match(timer, /Persistent=true/);
    assert.match(timer, /WantedBy=timers\.target/);

    // systemctl must reload units and enable the timer.
    const calls = (await readFile(callsFile, 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    const systemctlCalls = calls.filter((args) => args[0] === 'systemctl');
    assert.ok(
      systemctlCalls.some((args) => args.includes('daemon-reload')),
      'expected systemctl daemon-reload'
    );
    assert.ok(
      systemctlCalls.some((args) => args.includes('enable') && args.includes('smartbolig-ai-news.timer')),
      'expected timer to be enabled'
    );

    // The legacy OpenClaw cron job must be disabled so it can never double-run.
    const disableCall = calls.find(
      (args) => args[0] === 'openclaw' && args[1] === 'cron' && args[2] === 'disable'
    );
    assert.ok(disableCall, 'expected legacy OpenClaw cron job to be disabled');
    assert.equal(disableCall[3], 'legacy-job-id');
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test('AI News failure notifier requires gh and exits cleanly when an issue already exists', async () => {
  const tmp = await mkdtemp(path.join(tmpdir(), 'smartbolig-ai-news-notify-'));
  const callsFile = path.join(tmp, 'calls.jsonl');

  // Fake gh that reports an existing open issue for today.
  const fakeGh = path.join(tmp, 'gh');
  await writeFile(fakeGh, `#!/usr/bin/env node
const fs = require('node:fs');
fs.appendFileSync(process.env.SMARTBOLIG_FAKE_CALLS, JSON.stringify(['gh', ...process.argv.slice(2)]) + '\\n');
const args = process.argv.slice(2);
if (args[0] === 'issue' && args[1] === 'list') {
  console.log('123');
  process.exit(0);
}
if (args[0] === 'issue' && args[1] === 'create') {
  console.error('should not create a duplicate issue');
  process.exit(2);
}
process.exit(0);
`);
  await chmod(fakeGh, 0o755);

  // Fake journalctl so the notifier can collect logs in any environment.
  const fakeJournalctl = path.join(tmp, 'journalctl');
  await writeFile(fakeJournalctl, '#!/usr/bin/env bash\necho "fake log line"\n');
  await chmod(fakeJournalctl, 0o755);

  try {
    const { stdout } = await execFileAsync('bash', ['scripts/ai-news-failure-notify.sh'], {
      cwd: rootDir,
      env: {
        ...process.env,
        PATH: `${tmp}:${process.env.PATH}`,
        SMARTBOLIG_FAKE_CALLS: callsFile,
      },
    });

    assert.match(stdout, /already exists/, 'expected duplicate-guard to trigger');

    const calls = (await readFile(callsFile, 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    assert.ok(
      !calls.some((args) => args[0] === 'gh' && args[1] === 'issue' && args[2] === 'create'),
      'expected no duplicate issue to be created'
    );
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});
