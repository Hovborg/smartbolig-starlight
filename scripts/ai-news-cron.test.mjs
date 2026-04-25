import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(import.meta.dirname, '..');

test('OpenClaw AI News cron is installed with the tools it needs to run unattended', async () => {
  const tmp = await mkdtemp(path.join(tmpdir(), 'smartbolig-ai-news-cron-'));
  const fakeOpenclaw = path.join(tmp, 'openclaw');
  const callsFile = path.join(tmp, 'openclaw-calls.jsonl');

  await writeFile(fakeOpenclaw, `#!/usr/bin/env node
const fs = require('node:fs');
const callsFile = process.env.OPENCLAW_FAKE_CALLS;
fs.appendFileSync(callsFile, JSON.stringify(process.argv.slice(2)) + '\\n');
const args = process.argv.slice(2);
if (args.join(' ') === 'cron list --all --json') {
  console.log(JSON.stringify({ jobs: [] }));
  process.exit(0);
}
if (args[0] === 'approvals' && args[1] === 'allowlist' && args[2] === 'add') process.exit(0);
if (args[0] === 'cron' && args[1] === 'add') process.exit(0);
console.error('unexpected openclaw call', args.join(' '));
process.exit(2);
`);
  await chmod(fakeOpenclaw, 0o755);

  try {
    await execFileAsync('bash', ['scripts/install-openclaw-ai-news-cron.sh'], {
      cwd: rootDir,
      env: {
        ...process.env,
        PATH: `${tmp}:${process.env.PATH}`,
        OPENCLAW_FAKE_CALLS: callsFile,
        OPENCLAW_SMARTBOLIG_AI_NEWS_JOB_NAME: 'smartbolig-ai-news-test',
      },
    });

    const calls = (await readFile(callsFile, 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    const addCall = calls.find((args) => args[0] === 'cron' && args[1] === 'add');

    assert.ok(addCall, 'expected cron add to be called');
    const allowlistCall = calls.find((args) => args[0] === 'approvals' && args[1] === 'allowlist' && args[2] === 'add');
    assert.ok(allowlistCall, 'expected runner to be allowlisted');
    assert.equal(allowlistCall[allowlistCall.indexOf('--agent') + 1], 'main');
    assert.match(allowlistCall.at(-1), /scripts\/openclaw-ai-news-daily\.sh$/);
    assert.equal(addCall[addCall.indexOf('--tools') + 1], 'exec');
    assert.ok(addCall.includes('--light-context'));
    assert.match(addCall[addCall.indexOf('--message') + 1], /Execute exactly this command as one exec tool call/);
    assert.match(addCall[addCall.indexOf('--message') + 1], /scripts\/openclaw-ai-news-daily\.sh/);
    assert.match(addCall[addCall.indexOf('--message') + 1], /Do not run pwd, git status, npm, gh, cat, ls, cd, bash, sh/);
    assert.doesNotMatch(addCall[addCall.indexOf('--message') + 1], /Check git status and pull\/rebase main/i);
    assert.doesNotMatch(addCall[addCall.indexOf('--message') + 1], /npm run ai-news:source-health/);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});
