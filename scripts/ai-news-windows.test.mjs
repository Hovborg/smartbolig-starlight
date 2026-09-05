import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { retryState } from './ai-news-retry-state.mjs';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');

test('native runner preserves git -C arguments and fails on native errors in both Windows shells', { skip: process.platform !== 'win32' }, async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'smartbolig native args '));
  try {
    execFileSync('git', ['init', dir], { stdio: 'ignore' });
    const runner = await readFile(path.join(rootDir, 'scripts/smartbolig-ai-news-daily.ps1'), 'utf8');
    const helper = runner.slice(runner.indexOf('function Invoke-Native {'), runner.indexOf('function Assert-Preflight {'));
    const probe = path.join(dir, 'probe.ps1');
    const quotedDir = dir.replaceAll("'", "''");
    await writeFile(probe, `$ErrorActionPreference = 'Stop'
${helper}
$actual = Invoke-Native git -C '${quotedDir}' rev-parse --show-toplevel
if ([IO.Path]::GetFullPath($actual) -ne [IO.Path]::GetFullPath('${quotedDir}')) { throw 'Wrong native working directory' }
$failedAsExpected = $false
try { Invoke-Native cmd.exe /d /c exit 7 } catch {
    if ($_.Exception.Message -ne 'cmd.exe failed with exit code 7') { throw }
    $failedAsExpected = $true
}
if (-not $failedAsExpected) { throw 'Native failure was ignored' }
Write-Output 'NATIVE_ARGUMENTS_OK'
`);
    for (const shell of ['powershell.exe', 'pwsh.exe']) {
      const output = execFileSync(shell, ['-NoProfile', '-NonInteractive', '-File', probe], { encoding: 'utf8' });
      assert.match(output, /NATIVE_ARGUMENTS_OK/, shell);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('GitHub JSON field lists survive PowerShell script forwarding in both Windows shells', { skip: process.platform !== 'win32' }, async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'smartbolig gh arguments '));
  try {
    const runner = await readFile(path.join(rootDir, 'scripts/smartbolig-ai-news-daily.ps1'), 'utf8');
    const expressions = [...runner.matchAll(/--json\s+('[^']*'|[\w,]+)/g)].map((match) => match[1]);
    assert.equal(expressions.length, 4, 'exercise each actual gh --json field expression');
    const spy = path.join(dir, 'arguments.mjs');
    await writeFile(spy, 'console.log(JSON.stringify(process.argv.slice(2)));');
    const probe = path.join(dir, 'probe.ps1');
    const invocations = expressions.map((expression) => `Forward-GitHubArguments --json ${expression}`).join('\n');
    await writeFile(probe, `function Forward-GitHubArguments { & node '${spy.replaceAll("'", "''")}' @args }\n${invocations}\n`);
    const expected = expressions.map((expression) => ['--json', expression.replace(/^'|'$/g, '')]);
    for (const shell of ['powershell.exe', 'pwsh.exe']) {
      const output = execFileSync(shell, ['-NoProfile', '-NonInteractive', '-File', probe], { encoding: 'utf8' });
      const actual = output.trim().split(/\r?\n/).map((line) => JSON.parse(line));
      assert.deepEqual(actual, expected, shell);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Windows publisher handles git ls-remote returning no branch', { skip: process.platform !== 'win32' }, async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'smartbolig-empty-remote-'));
  try {
    execFileSync('git', ['init', '--bare', dir], { stdio: 'ignore' });
    const runner = await readFile(path.join(rootDir, 'scripts/smartbolig-ai-news-daily.ps1'), 'utf8');
    const statement = runner.split(/\r?\n/).find((line) => line.includes('$remoteLine =') && line.includes('git ls-remote'));
    assert.ok(statement, 'the test exercises the real remote-branch read');
    const probe = path.join(dir, 'probe.ps1');
    await writeFile(probe, `$ErrorActionPreference = 'Stop'\n$branch = 'ai-news/not-created-yet'\n${statement.replace('origin ', '. ')}\nif ($LASTEXITCODE -ne 0 -or $remoteLine) { throw 'Unexpected remote result' }\nWrite-Output 'EMPTY_REMOTE_OK'\n`);
    const output = execFileSync('pwsh', ['-NoProfile', '-File', probe], { cwd: dir, encoding: 'utf8' });
    assert.match(output, /EMPTY_REMOTE_OK/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Windows runner requires editorial LLM copy and completes the verified publish chain', async () => {
  const runner = await readFile(path.join(rootDir, 'scripts/smartbolig-ai-news-daily.ps1'), 'utf8');
  const prValidation = runner.indexOf("Wait-GitHubRun -Commit $prCommit");
  const merge = runner.indexOf('gh pr merge');
  const deployment = runner.indexOf("Wait-GitHubRun -Commit $mergeCommit");
  const publicCheck = runner.lastIndexOf('Wait-PublicIssue -IssueDate $Date');

  assert.match(runner, /--require-llm/);
  assert.match(runner, /copySource -ne 'llm'/);
  assert.match(runner, /semanticReview -ne 'passed'/);
  assert.match(runner, /npm run ai-news:quality -- --date \$Date/);
  assert.match(runner, /worktree add --detach \$runRoot \$baseCommit/);
  assert.doesNotMatch(runner, /git stash/);
  assert.doesNotMatch(runner, /git switch -c/);
  assert.match(runner, /--match-head-commit \$prCommit/);
  assert.match(runner, /headRefOid -ne \$prCommit/);
  assert.match(runner, /baseRefName -ne 'main'/);
  assert.match(runner, /force-with-lease=refs\/heads\/\$branch/);
  assert.match(runner, /ai-news\/\$Date-\$\(\$result\.storyFingerprint\.Substring/);
  assert.match(runner, /-Event pull_request -ExpectedRef \$branch/);
  assert.match(runner, /-Event push -ExpectedRef main/);
  assert.match(runner, /data-issue-fingerprint/);
  assert.ok(runner.indexOf('ai-news-retry-state.mjs') < runner.indexOf('ai-news-publish.mjs'));
  assert.ok(prValidation >= 0 && prValidation < merge, 'PR validation must finish before merge');
  assert.ok(merge < deployment && deployment < publicCheck, 'merge must be deployed and publicly verified in order');
  assert.doesNotMatch(runner, /wsl\.exe|systemctl/);
  assert.match(runner, /Unexpected generated paths/);
  assert.match(runner, /git add -- \$allowedPaths/);
  assert.doesNotMatch(runner, /gh issue create/);
});

test('post-merge retry resumes deploy and public readback instead of silently generating or skipping', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'smartbolig-ai-news-readback-'));
  const date = '2026-08-27';
  const fingerprint = 'b'.repeat(64);
  const daDir = path.join(dir, 'src/content/docs/da/ai/nyheder');
  const enDir = path.join(dir, 'src/content/docs/en/ai/nyheder');
  try {
    assert.deepEqual(await retryState({ rootDir: dir, date }), { action: 'generate' });
    await mkdir(daDir, { recursive: true });
    await mkdir(enDir, { recursive: true });
    const issue = `---\ndate: ${date}\nnews:\n  issueFingerprint: "${fingerprint}"\n---\n`;
    await writeFile(path.join(daDir, `${date}.mdx`), issue);
    await writeFile(path.join(enDir, `${date}.mdx`), issue);
    assert.deepEqual(await retryState({ rootDir: dir, date }), {
      action: 'resume-public-verification',
      issueFingerprint: fingerprint,
    });

    await writeFile(path.join(enDir, `${date}.mdx`), issue.replace(fingerprint, 'c'.repeat(64)));
    await assert.rejects(retryState({ rootDir: dir, date }), /mismatched fingerprints/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('a retry updates the deterministic remote branch while the failed detached worktree remains', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'smartbolig-ai-news-retry-'));
  const remote = path.join(dir, 'remote.git');
  const base = path.join(dir, 'base');
  const first = path.join(dir, 'run-first');
  const retry = path.join(dir, 'run-retry');
  const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  try {
    git(dir, 'init', '--bare', remote);
    git(dir, 'clone', remote, base);
    git(base, 'config', 'user.email', 'automation@example.invalid');
    git(base, 'config', 'user.name', 'SmartBolig Automation Test');
    await writeFile(path.join(base, 'seed.txt'), 'seed\n');
    git(base, 'add', 'seed.txt');
    git(base, 'commit', '-m', 'seed');
    git(base, 'branch', '-M', 'main');
    git(base, 'push', '-u', 'origin', 'main');
    const baseCommit = git(base, 'rev-parse', 'HEAD');
    const branch = 'ai-news/2026-08-27-deadbeefcafe';

    git(base, 'worktree', 'add', '--detach', first, baseCommit);
    await writeFile(path.join(first, 'issue.txt'), 'first attempt\n');
    git(first, 'add', 'issue.txt');
    git(first, 'commit', '-m', 'first attempt');
    const firstCommit = git(first, 'rev-parse', 'HEAD');
    git(first, 'push', 'origin', `HEAD:refs/heads/${branch}`);

    git(base, 'worktree', 'add', '--detach', retry, baseCommit);
    await writeFile(path.join(retry, 'issue.txt'), 'retry attempt\n');
    git(retry, 'add', 'issue.txt');
    git(retry, 'commit', '-m', 'retry attempt');
    const retryCommit = git(retry, 'rev-parse', 'HEAD');
    git(retry, 'push', `--force-with-lease=refs/heads/${branch}:${firstCommit}`, 'origin', `HEAD:refs/heads/${branch}`);

    const remoteCommit = git(base, 'ls-remote', '--heads', 'origin', `refs/heads/${branch}`).split(/\s+/)[0];
    assert.equal(remoteCommit, retryCommit);
    assert.equal(git(first, 'rev-parse', '--abbrev-ref', 'HEAD'), 'HEAD');
    assert.equal(git(retry, 'rev-parse', '--abbrev-ref', 'HEAD'), 'HEAD');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Windows task is daily, persistent, non-overlapping, and runs as the owner', async () => {
  const installer = await readFile(path.join(rootDir, 'scripts/install-windows-ai-news-task.ps1'), 'utf8');
  assert.match(installer, /Shark Smartbolig AI News/);
  assert.match(installer, /New-ScheduledTaskTrigger -Daily -At '07:20'/);
  assert.match(installer, /-StartWhenAvailable/);
  assert.match(installer, /-MultipleInstances IgnoreNew/);
  assert.match(installer, /-LogonType Interactive/);
  assert.match(installer, /\.automation\\smartbolig-ai-news/);
  assert.doesNotMatch(installer, /wsl\.exe|systemctl/);
});

test('manual workflow dispatch validates but cannot deploy or ping search engines', async () => {
  const workflow = await readFile(path.join(rootDir, '.github/workflows/deploy.yml'), 'utf8');
  const protectedCondition = /if: github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/g;
  assert.equal([...workflow.matchAll(protectedCondition)].length, 2);
  assert.doesNotMatch(workflow, /if: github\.event_name != 'pull_request'/);
});
