import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { retryState } from './ai-news-retry-state.mjs';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');

test('Windows network checks use the guarded helper and honor native failures in both shells', { skip: process.platform !== 'win32' }, async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'smartbolig guarded HTTP '));
  try {
    const runner = await readFile(path.join(rootDir, 'scripts/smartbolig-ai-news-daily.ps1'), 'utf8');
    const publicCheck = runner.slice(runner.indexOf('function Wait-PublicIssue {'), runner.indexOf('\n$Date = if'));
    const preflightStart = runner.indexOf('    $networkJson = & node');
    const preflightCheck = runner.slice(preflightStart, runner.indexOf('\n}', preflightStart));
    assert.ok(publicCheck.includes('ai-news-public-check.mjs'));
    assert.ok(preflightCheck.includes('ai-news-public-check.mjs'));
    const probe = path.join(dir, 'probe.ps1');
    await writeFile(probe, `$ErrorActionPreference = 'Stop'
$RepoRoot = Join-Path $PSScriptRoot 'repo with spaces'
$script:issueCalls = 0
$script:preflightFail = $false
function node {
    if ($args[0] -ne (Join-Path $RepoRoot 'scripts/ai-news-public-check.mjs')) { throw 'Wrong helper path' }
    if ($args[1] -eq 'issue') {
        if ($args[2] -ne '2026-09-30' -or $args[3] -ne '${'a'.repeat(64)}') { throw 'Wrong issue arguments' }
        $script:issueCalls++
        if ($script:issueCalls -eq 1) { $global:LASTEXITCODE = 1; return }
        $global:LASTEXITCODE = 0
        'PUBLIC_ISSUE_OK'
        return
    }
    if ($args[1] -eq 'preflight' -and $args.Count -eq 2) {
        $global:LASTEXITCODE = if ($script:preflightFail) { 1 } else { 0 }
        if (-not $script:preflightFail) { '{"sourceStatus":200,"publicStatus":200}' }
        return
    }
    throw 'Unexpected helper mode'
}
function Start-Sleep { }
${publicCheck}
Wait-PublicIssue -IssueDate '2026-09-30' -IssueFingerprint '${'a'.repeat(64)}'
if ($script:issueCalls -ne 2) { throw 'Public readback did not retry a nonzero native exit' }
${preflightCheck}
$script:preflightFail = $true
$failed = $false
try {
${preflightCheck}
} catch { $failed = $true }
if (-not $failed) { throw 'Preflight accepted a nonzero native exit' }
Write-Output 'GUARDED_HTTP_OK'
`);
    for (const shell of ['powershell.exe', 'pwsh.exe']) {
      const output = execFileSync(shell, ['-NoProfile', '-NonInteractive', '-File', probe], { encoding: 'utf8', timeout: 30_000 });
      assert.match(output, /GUARDED_HTTP_OK/, shell);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('task transcripts retain native output, stderr and the failing stage without an attached console', { skip: process.platform !== 'win32' }, async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'smartbolig task transcript '));
  try {
    const runner = await readFile(path.join(rootDir, 'scripts/smartbolig-ai-news-daily.ps1'), 'utf8');
    const helper = runner.slice(runner.indexOf('function Invoke-Native {'), runner.indexOf('function Assert-Preflight {'));
    const failure = runner.slice(runner.lastIndexOf('} catch {') + '} catch {'.length, runner.lastIndexOf('} finally {'));
    assert.ok(failure.includes('AI_NEWS_FAILED'));
    const nativeScript = path.join(dir, 'native.mjs');
    await writeFile(nativeScript, `const code = Number(process.argv[2]);
console.log('native-output-' + code);
console.error('native-diagnostic-' + code);
process.exit(code);
`);
    await writeFile(path.join(dir, 'rejected.ps1'), "throw 'script-adapter-rejected'\n");
    const probe = path.join(dir, 'probe.ps1');
    await writeFile(probe, `param([string]$NativeScript, [string]$LogPath)
$ErrorActionPreference = 'Stop'
${helper}
$stage = 'test-native-output'
$Date = '2026-09-10'
$runRoot = $PSScriptRoot
$exitCode = 0
Start-Transcript -LiteralPath $LogPath | Out-Null
try {
    Invoke-Native node $NativeScript 0
    $captured = Invoke-Native node $NativeScript 0
    if ($captured -cne 'native-output-0') { throw 'Stderr polluted the captured stdout' }
    if ($ErrorActionPreference -ne 'Stop') { throw 'Native helper changed the caller preference' }
    $scriptRejected = $false
    try { Invoke-Native (Join-Path $PSScriptRoot 'rejected.ps1') } catch {
        if ($_.Exception.Message -ne 'script-adapter-rejected') { throw }
        $scriptRejected = $true
    }
    if (-not $scriptRejected) { throw 'A script adapter failure was ignored' }
    Invoke-Native node $NativeScript 17
} catch {
${failure}
} finally {
    Stop-Transcript | Out-Null
}
if ($exitCode -ne 1) { throw 'The runner did not record the native failure' }
`);
    for (const shell of ['powershell.exe', 'pwsh.exe']) {
      const log = path.join(dir, `${shell}.log`);
      execFileSync(shell, ['-NoProfile', '-NonInteractive', '-File', probe, '-NativeScript', nativeScript, '-LogPath', log], { stdio: 'ignore', timeout: 30_000 });
      const transcript = await readFile(log, 'utf8');
      for (const marker of ['native-output-0', 'native-diagnostic-0', 'native-output-17', 'native-diagnostic-17', 'AI_NEWS_FAILED stage=test-native-output', 'node failed with exit code 17']) {
        assert.ok(transcript.includes(marker), `${shell}: missing ${marker} from task transcript`);
      }
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('GitHub polling preserves JSON and retries despite notices on stderr in both Windows shells', { skip: process.platform !== 'win32' }, async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'smartbolig github polling '));
  try {
    const runner = await readFile(path.join(rootDir, 'scripts/smartbolig-ai-news-daily.ps1'), 'utf8');
    const helper = runner.slice(runner.indexOf('function Invoke-Native {'), runner.indexOf('function Assert-Preflight {'));
    const polling = runner.slice(runner.indexOf('function Wait-GitHubRun {'), runner.indexOf('function Wait-PublicIssue {'));
    const spy = path.join(dir, 'github.mjs');
    await writeFile(spy, `import fs from 'node:fs';
if (process.argv[2] === 'run' && process.argv[3] === 'list') {
  console.error('harmless-notice');
  if (!fs.existsSync('attempted')) { fs.writeFileSync('attempted', 'yes'); process.exit(4); }
  console.log(JSON.stringify([{databaseId:123, event:'push', headSha:'${'a'.repeat(40)}', headBranch:'main'}]));
} else if (process.argv[2] !== 'run' || process.argv[3] !== 'watch') { process.exit(2); }
`);
    const probe = path.join(dir, 'probe.ps1');
    await writeFile(probe, `$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
Remove-Item -LiteralPath (Join-Path $PSScriptRoot 'attempted') -ErrorAction SilentlyContinue
function gh { & node (Join-Path $PSScriptRoot 'github.mjs') @args; $global:LASTEXITCODE = $LASTEXITCODE }
function Start-Sleep { }
${helper}
${polling}
$id = Wait-GitHubRun -Commit '${'a'.repeat(40)}' -Event push -ExpectedRef main -Phase 'test'
if ($id -ne '123' -or $ErrorActionPreference -ne 'Stop') { throw 'Polling changed the result or caller preference' }
Write-Output 'GITHUB_NOTICE_RETRY_OK'
`);
    for (const shell of ['powershell.exe', 'pwsh.exe']) {
      const output = execFileSync(shell, ['-NoProfile', '-NonInteractive', '-File', probe], { encoding: 'utf8', timeout: 30_000 });
      assert.match(output, /GITHUB_NOTICE_RETRY_OK/, shell);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('Windows PR CI polling ignores fork runs with the same branch and commit', { skip: process.platform !== 'win32' }, async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'smartbolig PR run identity '));
  try {
    const runner = await readFile(path.join(rootDir, 'scripts/smartbolig-ai-news-daily.ps1'), 'utf8');
    const helper = runner.slice(runner.indexOf('function Invoke-Native {'), runner.indexOf('function Assert-Preflight {'));
    const polling = runner.slice(runner.indexOf('function Wait-GitHubRun {'), runner.indexOf('function Wait-PublicIssue {'));
    const sha = 'a'.repeat(40);
    const branch = 'ai-news/2026-10-02-abc123';
    const fork = { databaseId: 101, id: 101, event: 'pull_request', headSha: sha, head_sha: sha, headBranch: branch, head_branch: branch, head_repository: { full_name: 'attacker/smartbolig-starlight' }, headRepository: 'attacker/smartbolig-starlight' };
    const own = { ...fork, databaseId: 202, id: 202, head_repository: { full_name: 'Hovborg/smartbolig-starlight' }, headRepository: 'Hovborg/smartbolig-starlight' };
    const probe = path.join(dir, 'probe.ps1');
    await writeFile(probe, `$ErrorActionPreference = 'Stop'
$script:onlyFork = $false
$script:watched = ''
function gh {
    if ($args[0] -eq 'run' -and $args[1] -eq 'list') {
        $global:LASTEXITCODE = 0
        '${JSON.stringify([fork, own])}'
        return
    }
    if ($args[0] -eq 'api') {
        $global:LASTEXITCODE = 0
        '${JSON.stringify(fork)}'
        if (-not $script:onlyFork) { '${JSON.stringify(own)}' }
        return
    }
    if ($args[0] -eq 'run' -and $args[1] -eq 'watch') {
        $script:watched = [string]$args[2]
        $global:LASTEXITCODE = 0
        return
    }
    throw 'Unexpected gh call'
}
function Start-Sleep { }
${helper}
${polling}
$id = Wait-GitHubRun -Commit '${sha}' -Event pull_request -ExpectedRef '${branch}' -Phase test
if ($id -ne '202' -or $script:watched -ne '202') { throw 'Fork run won PR CI selection' }
$script:onlyFork = $true
$script:watched = ''
$failed = $false
try { Wait-GitHubRun -Commit '${sha}' -Event pull_request -ExpectedRef '${branch}' -Phase test | Out-Null }
catch { if ($_.Exception.Message -notmatch 'No exact GitHub Actions run') { throw }; $failed = $true }
if (-not $failed -or $script:watched) { throw 'Fork-only run passed PR CI selection' }
Write-Output 'FORK_RUN_IGNORED_OK'
`);
    for (const shell of ['powershell.exe', 'pwsh.exe']) {
      const output = execFileSync(shell, ['-NoProfile', '-NonInteractive', '-File', probe], { encoding: 'utf8', timeout: 30_000 });
      assert.match(output, /FORK_RUN_IGNORED_OK/, shell);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('draft generation keeps its result path and live LLM mode out of later quality checks', { skip: process.platform !== 'win32' }, async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'smartbolig draft environment '));
  try {
    const runner = await readFile(path.join(rootDir, 'scripts/smartbolig-ai-news-daily.ps1'), 'utf8');
    const generation = runner.slice(runner.indexOf("    $stage = 'draft-generation'"), runner.indexOf("    $stage = 'image-rendering'"));
    assert.ok(generation.includes('scripts/ai-news-publish.mjs'));
    const probe = path.join(dir, 'probe.ps1');
    await writeFile(probe, `param([switch]$FailGeneration)
$ErrorActionPreference = 'Stop'
$Date = '2026-09-10'
$removeRunRoot = $false
function Invoke-Native {
    if ($args[0] -ne 'node' -or $args[1] -ne 'scripts/ai-news-publish.mjs' -or '--require-llm' -notin $args) {
        throw 'Generation must still require real LLM copy'
    }
    if ($FailGeneration) { throw 'Expected generation failure' }
    [IO.File]::WriteAllText($env:AI_NEWS_RESULT_PATH, '{"status":"publish","copySource":"llm","semanticReview":"passed","storyFingerprint":"${'a'.repeat(64)}","issueFingerprint":"${'b'.repeat(64)}"}')
}
try {
${generation}
} catch {
    if (-not $FailGeneration -or $_.Exception.Message -ne 'Expected generation failure') { throw }
}
& node -e 'console.log(JSON.stringify(Object.fromEntries(Object.entries(process.env).filter(([key]) => /^AI_NEWS_(LLM|REQUIRE_LLM|RESULT_PATH)$/.test(key)))))'
if (Test-Path -LiteralPath $resultPath) { Remove-Item -LiteralPath $resultPath -Force; throw 'Generation result was not cleaned up' }
`);
    const env = { ...process.env };
    for (const key of ['AI_NEWS_LLM', 'AI_NEWS_REQUIRE_LLM', 'AI_NEWS_RESULT_PATH']) delete env[key];
    for (const shell of ['powershell.exe', 'pwsh.exe']) {
      for (const mode of [[], ['-FailGeneration']]) {
        const output = execFileSync(shell, ['-NoProfile', '-NonInteractive', '-File', probe, ...mode], { encoding: 'utf8', env });
        assert.deepEqual(JSON.parse(output.trim()), {}, `${shell}: ${mode.join(' ') || 'success'}`);
      }
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

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
    assert.equal(expressions.length, 5, 'exercise each actual gh --json field expression');
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

test('Windows runner requires editorial LLM copy and leaves a green PR for human review', async () => {
  const runner = await readFile(path.join(rootDir, 'scripts/smartbolig-ai-news-daily.ps1'), 'utf8');
  const prValidation = runner.indexOf("Wait-GitHubRun -Commit $prCommit");
  const reviewReady = runner.lastIndexOf('AI_NEWS_STATUS=awaiting-editorial-review');

  assert.match(runner, /--require-llm/);
  assert.match(runner, /copySource -ne 'llm'/);
  assert.match(runner, /semanticReview -ne 'passed'/);
  assert.match(runner, /npm run ai-news:quality -- --date \$Date/);
  assert.match(runner, /worktree add --detach \$runRoot \$baseCommit/);
  assert.doesNotMatch(runner, /git stash/);
  assert.doesNotMatch(runner, /git switch -c/);
  assert.doesNotMatch(runner, /gh pr merge|merges automatically/);
  assert.match(runner, /human editorial review are required before manual merge/);
  assert.match(runner, /headRefOid -ne \$prCommit/);
  assert.match(runner, /baseRefName -ne 'main'/);
  assert.match(runner, /force-with-lease=refs\/heads\/\$branch/);
  assert.match(runner, /ai-news\/\$Date-\$\(\[Guid\]::NewGuid\(\)/);
  assert.match(runner, /-Event pull_request -ExpectedRef \$branch/);
  assert.match(runner, /-Event push -ExpectedRef main/);
  assert.match(runner, /ai-news-public-check\.mjs/);
  assert.ok(runner.indexOf('ai-news-retry-state.mjs') < runner.indexOf('ai-news-publish.mjs'));
  assert.ok(prValidation >= 0 && prValidation < reviewReady, 'PR validation must finish before editorial review');
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

test('Windows publisher uses a fresh hex branch for every attempt', { skip: process.platform !== 'win32' }, async () => {
  const runner = await readFile(path.join(rootDir, 'scripts/smartbolig-ai-news-daily.ps1'), 'utf8');
  const branchLine = runner.split(/\r?\n/).find((line) => line.trim().startsWith('$branch = "ai-news/'));
  assert.ok(branchLine, 'exercise the actual branch assignment');
  for (const shell of ['powershell.exe', 'pwsh.exe']) {
    const script = `$Date = '2026-08-27'; $result = [pscustomobject]@{ storyFingerprint = '${'a'.repeat(64)}' }; ${branchLine}; Write-Output $branch; ${branchLine}; Write-Output $branch`;
    const branches = execFileSync(shell, ['-NoProfile', '-NonInteractive', '-Command', script], { cwd: rootDir, encoding: 'utf8' }).trim().split(/\r?\n/);
    assert.equal(branches.length, 2);
    for (const branch of branches) assert.match(branch, /^ai-news\/2026-08-27-[a-f0-9]{12}$/);
    assert.notEqual(branches[0], branches[1], 'a retry must not reuse a review branch');
  }
});

test('branch creation refuses to replace an existing remote head', async () => {
  const runner = await readFile(path.join(rootDir, 'scripts/smartbolig-ai-news-daily.ps1'), 'utf8');
  assert.ok(runner.includes('"--force-with-lease=refs/heads/$branch`:"'), 'publisher must require an absent remote branch');
  assert.doesNotMatch(runner, /force-with-lease=refs\/heads\/\$branch`:\$remoteOid/);
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
    const alternate = 'ai-news/2026-08-27-abcdef123456';

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
    assert.throws(() => git(retry, 'push', `--force-with-lease=refs/heads/${branch}:`, 'origin', `HEAD:refs/heads/${branch}`));
    assert.equal(git(base, 'ls-remote', '--heads', 'origin', `refs/heads/${branch}`).split(/\s+/)[0], firstCommit);
    git(retry, 'push', `--force-with-lease=refs/heads/${alternate}:`, 'origin', `HEAD:refs/heads/${alternate}`);
    assert.equal(git(base, 'ls-remote', '--heads', 'origin', `refs/heads/${alternate}`).split(/\s+/)[0], retryCommit);
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


test('Windows PR lookup ignores same-name fork PRs', { skip: process.platform !== 'win32' }, async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'smartbolig-pr-identity-'));
  try {
    const runner = await readFile(path.join(rootDir, 'scripts/smartbolig-ai-news-daily.ps1'), 'utf8');
    const selection = runner.split(/\r?\n/).find((line) => line.includes('$prUrls = @('));
    assert.ok(selection?.includes('ai-news-pr-identity.mjs current Hovborg $branch'));
    const fixture = path.join(dir, 'prs.json');
    const probe = path.join(dir, 'probe.ps1');
    const branch = 'ai-news/2026-10-02-abcdef123456';
    const fork = { url: 'https://github.com/Hovborg/smartbolig-starlight/pull/11', headRefName: branch, baseRefName: 'main', headRefOid: 'a'.repeat(40), isCrossRepository: true, headRepositoryOwner: { login: 'attacker' } };
    const own = { ...fork, url: 'https://github.com/Hovborg/smartbolig-starlight/pull/12', isCrossRepository: false, headRepositoryOwner: { login: 'Hovborg' } };
    await writeFile(probe, `$ErrorActionPreference = 'Stop'\n$branch = '${branch}'\n$prJson = Get-Content -Raw -LiteralPath '${fixture.replaceAll("'", "''")}'\n${selection}\nif ($LASTEXITCODE -ne 0) { throw 'helper failed' }\nWrite-Output ($prUrls -join '|')\n`);
    await writeFile(fixture, JSON.stringify([fork, own]));
    let output = execFileSync('pwsh', ['-NoProfile', '-NonInteractive', '-File', probe], { cwd: rootDir, encoding: 'utf8' });
    assert.equal(output.trim(), own.url);
    await writeFile(fixture, JSON.stringify([fork]));
    output = execFileSync('pwsh', ['-NoProfile', '-NonInteractive', '-File', probe], { cwd: rootDir, encoding: 'utf8' });
    assert.equal(output.trim(), '');
    assert.match(runner, /headRepositoryOwner\.login -ine 'Hovborg'/);
    assert.match(runner, /--head "Hovborg:\$branch"/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('any owned review PR stops a rerun before LLM work while fork PRs do not', { skip: process.platform !== 'win32' }, async () => {
  const runner = await readFile(path.join(rootDir, 'scripts/smartbolig-ai-news-daily.ps1'), 'utf8');
  const start = runner.indexOf("    $stage = 'pending-editorial-review'");
  const end = runner.indexOf("    $stage = 'dependencies-and-sources'");
  assert.ok(start > 0 && end > start, 'review guard must precede dependencies and generation');
  const guard = runner.slice(start, end);
  const owned = {
    url: 'https://github.com/Hovborg/smartbolig-starlight/pull/165',
    headRefName: 'ai-news/2026-10-01-deadbeefcafe',
    baseRefName: 'main', isCrossRepository: false,
    headRepositoryOwner: { login: 'Hovborg' },
  };
  const fork = { ...owned, url: 'https://github.com/Hovborg/smartbolig-starlight/pull/166', isCrossRepository: true, headRepositoryOwner: { login: 'attacker' } };
  const dir = await mkdtemp(path.join(tmpdir(), 'smartbolig-review-guard-'));
  try {
    const probe = path.join(dir, 'probe.ps1');
    await writeFile(probe, `param([switch]$Own)
$ErrorActionPreference = 'Stop'
$Date = '2026-10-02'
$RepoRoot = '${rootDir.replaceAll("'", "''")}'
Set-Location -LiteralPath $RepoRoot
$script:prJson = if ($Own) { '${JSON.stringify([fork, owned])}' } else { '${JSON.stringify([fork])}' }
function gh { if ($args[0] -ne 'pr' -or $args[1] -ne 'list') { throw 'Unexpected gh call' }; $global:LASTEXITCODE = 0; $script:prJson }
function RunGuard {
${guard}
    Write-Output 'CONTINUED_TO_GENERATION'
}
RunGuard
`);
    for (const shell of ['powershell.exe', 'pwsh.exe']) {
      const ownedOutput = execFileSync(shell, ['-NoProfile', '-NonInteractive', '-File', probe, '-Own'], { cwd: rootDir, encoding: 'utf8', timeout: 30_000 });
      assert.match(ownedOutput, /AI_NEWS_STATUS=awaiting-editorial-review date=2026-10-02 pr=https:\/\/github.com\/Hovborg\/smartbolig-starlight\/pull\/165/);
      assert.doesNotMatch(ownedOutput, /CONTINUED_TO_GENERATION/);
      const forkOutput = execFileSync(shell, ['-NoProfile', '-NonInteractive', '-File', probe], { cwd: rootDir, encoding: 'utf8', timeout: 30_000 });
      assert.match(forkOutput, /CONTINUED_TO_GENERATION/);
      assert.doesNotMatch(forkOutput, /AI_NEWS_STATUS=awaiting-editorial-review/);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('late review check sees a PR opened during generation before pushing', { skip: process.platform !== 'win32' }, async () => {
  const runner = await readFile(path.join(rootDir, 'scripts/smartbolig-ai-news-daily.ps1'), 'utf8');
  const committed = runner.indexOf('Invoke-Native git commit -m "feat(ai-news): publish $Date brief"');
  const start = runner.indexOf("    $stage = 'pre-push-editorial-review'", committed);
  const end = runner.indexOf("    $stage = 'github-publish'", start);
  assert.ok(committed > 0 && start > committed && end > start, 'all open owned PRs must be rechecked after commit and before push');
  const guard = runner.slice(start, end);
  const owned = {
    url: 'https://github.com/Hovborg/smartbolig-starlight/pull/165',
    headRefName: 'ai-news/2026-10-01-deadbeefcafe',
    baseRefName: 'main', isCrossRepository: false,
    headRepositoryOwner: { login: 'Hovborg' },
  };
  const fork = { ...owned, url: 'https://github.com/Hovborg/smartbolig-starlight/pull/166', isCrossRepository: true, headRepositoryOwner: { login: 'attacker' } };
  const dir = await mkdtemp(path.join(tmpdir(), 'smartbolig-late-review-guard-'));
  try {
    const probe = path.join(dir, 'probe.ps1');
    await writeFile(probe, `param([switch]$Own)
$ErrorActionPreference = 'Stop'
$Date = '2026-10-02'
Set-Location -LiteralPath '${rootDir.replaceAll("'", "''")}'
$script:prJson = if ($Own) { '${JSON.stringify([fork, owned])}' } else { '${JSON.stringify([fork])}' }
function gh { if ($args[0] -ne 'pr' -or $args[1] -ne 'list') { throw 'Unexpected gh call' }; $global:LASTEXITCODE = 0; $script:prJson }
function RunGuard {
${guard}
    Write-Output 'CONTINUED_TO_PUSH'
}
RunGuard
`);
    for (const shell of ['powershell.exe', 'pwsh.exe']) {
      const ownedOutput = execFileSync(shell, ['-NoProfile', '-NonInteractive', '-File', probe, '-Own'], { cwd: rootDir, encoding: 'utf8', timeout: 30_000 });
      assert.match(ownedOutput, /AI_NEWS_STATUS=awaiting-editorial-review date=2026-10-02 pr=https:\/\/github.com\/Hovborg\/smartbolig-starlight\/pull\/165/);
      assert.doesNotMatch(ownedOutput, /CONTINUED_TO_PUSH/);
      const forkOutput = execFileSync(shell, ['-NoProfile', '-NonInteractive', '-File', probe], { cwd: rootDir, encoding: 'utf8', timeout: 30_000 });
      assert.match(forkOutput, /CONTINUED_TO_PUSH/);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
