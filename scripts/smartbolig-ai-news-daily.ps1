[CmdletBinding()]
param(
    [string]$Date,
    [switch]$DryRun,
    [switch]$Preflight,
    [string]$RepoRoot = 'C:\codex_projekts\.automation\smartbolig-ai-news'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$env:Path = @(
    (Join-Path $env:USERPROFILE '.local\bin'),
    'C:\Program Files\nodejs',
    'C:\Program Files\Git\cmd',
    'C:\Program Files\GitHub CLI',
    $env:Path
) -join ';'

function Get-CopenhagenDate {
    $zone = [TimeZoneInfo]::FindSystemTimeZoneById('Romance Standard Time')
    [TimeZoneInfo]::ConvertTimeFromUtc([DateTime]::UtcNow, $zone).ToString('yyyy-MM-dd')
}

function Invoke-Native {
    # Keep native flags out of PowerShell parameter binding: git -C must not
    # bind to a wrapper parameter named Command.
    if ($args.Count -eq 0) { throw 'A native command is required' }
    $nativeCommand = $args[0]
    $nativeArguments = @($args | Select-Object -Skip 1)
    & $nativeCommand @nativeArguments
    if ($LASTEXITCODE -ne 0) { throw "$nativeCommand failed with exit code $LASTEXITCODE" }
}

function Assert-Preflight {
    foreach ($command in @('git', 'node', 'npm', 'gh', 'claude')) {
        if (-not (Get-Command $command -ErrorAction SilentlyContinue)) { throw "Missing required command: $command" }
    }
    Invoke-Native gh auth status
    $remote = (& git -C $RepoRoot remote get-url origin).Trim()
    if ($LASTEXITCODE -ne 0 -or $remote -notmatch 'Hovborg/smartbolig-starlight(?:\.git)?$') { throw "Unexpected origin remote: $remote" }
    Invoke-Native git -C $RepoRoot ls-remote --exit-code origin HEAD

    $claudeStatus = & claude auth status
    if ($LASTEXITCODE -ne 0) { throw 'Claude authentication check failed' }
    $claudeAuth = $claudeStatus | ConvertFrom-Json
    if ($claudeAuth.loggedIn -ne $true) { throw 'Claude is not logged in for the Scheduled Task owner' }

    $source = Invoke-WebRequest -Uri 'https://openai.com/news/rss.xml' -UseBasicParsing -TimeoutSec 20
    $public = Invoke-WebRequest -Uri 'https://smartbolig.net/da/ai/nyheder/' -UseBasicParsing -TimeoutSec 20
    if ($source.StatusCode -ne 200 -or $public.StatusCode -ne 200) { throw 'Network preflight returned a non-200 response' }
    Write-Host "PREFLIGHT_OK github=authenticated remote=reachable claude=authenticated source_status=$($source.StatusCode) public_status=$($public.StatusCode)"
}

function Wait-GitHubRun {
    param(
        [Parameter(Mandatory = $true)][string]$Commit,
        [Parameter(Mandatory = $true)][ValidateSet('pull_request', 'push')][string]$Event,
        [Parameter(Mandatory = $true)][string]$ExpectedRef,
        [Parameter(Mandatory = $true)][string]$Phase
    )
    for ($attempt = 1; $attempt -le 24; $attempt++) {
        $json = & gh run list --repo Hovborg/smartbolig-starlight --workflow deploy.yml --commit $Commit --event $Event --limit 5 --json 'databaseId,status,conclusion,event,headBranch,headSha' 2>$null
        if ($LASTEXITCODE -eq 0 -and $json) {
            $runs = @($json | ConvertFrom-Json | Where-Object { $_.event -eq $Event -and $_.headSha -eq $Commit -and $_.headBranch -eq $ExpectedRef })
            if ($runs.Count -eq 1) {
                $runId = [string]$runs[0].databaseId
                Write-Host "$Phase GitHub Actions run: $runId event=$Event ref=$ExpectedRef sha=$Commit"
                Invoke-Native gh run watch $runId --repo Hovborg/smartbolig-starlight --exit-status --interval 10
                return $runId
            }
            if ($runs.Count -gt 1) { throw "Multiple matching $Phase runs found for $Commit" }
        }
        Start-Sleep -Seconds 5
    }
    throw "No exact GitHub Actions run appeared for $Phase event=$Event ref=$ExpectedRef sha=$Commit"
}

function Wait-PublicIssue {
    param(
        [Parameter(Mandatory = $true)][string]$IssueDate,
        [Parameter(Mandatory = $true)][string]$IssueFingerprint
    )
    $targets = @(
        @{ Name = 'da-article'; Url = "https://smartbolig.net/da/ai/nyheder/$IssueDate/"; Marker = "data-issue-fingerprint=`"$IssueFingerprint`"" },
        @{ Name = 'en-article'; Url = "https://smartbolig.net/en/ai/nyheder/$IssueDate/"; Marker = "data-issue-fingerprint=`"$IssueFingerprint`"" },
        @{ Name = 'da-index'; Url = 'https://smartbolig.net/da/ai/nyheder/'; Marker = "/da/ai/nyheder/$IssueDate" },
        @{ Name = 'en-index'; Url = 'https://smartbolig.net/en/ai/nyheder/'; Marker = "/en/ai/nyheder/$IssueDate" }
    )
    for ($attempt = 1; $attempt -le 60; $attempt++) {
        try {
            $results = foreach ($target in $targets) {
                $response = Invoke-WebRequest -Uri $target.Url -UseBasicParsing -TimeoutSec 15
                [pscustomobject]@{ Name = $target.Name; Ok = $response.StatusCode -eq 200 -and $response.Content.Contains($target.Marker) }
            }
            if (@($results | Where-Object { -not $_.Ok }).Count -eq 0) {
                Write-Host "PUBLIC_OK date=$IssueDate fingerprint=$IssueFingerprint da_article=200 en_article=200 da_index=200 en_index=200"
                return
            }
        } catch { Write-Host "Public verification attempt $attempt/60 is not ready yet." }
        Start-Sleep -Seconds 10
    }
    throw "The bilingual article and indexes did not expose fingerprint $IssueFingerprint within 10 minutes"
}

$Date = if ($Date) { $Date } else { Get-CopenhagenDate }
if ($Date -notmatch '^\d{4}-\d{2}-\d{2}$') { throw "Invalid date: $Date" }
$RepoRoot = [IO.Path]::GetFullPath($RepoRoot)
$expectedRoot = 'C:\codex_projekts\.automation\smartbolig-ai-news'
if ($RepoRoot -ne $expectedRoot) { throw "Refusing unexpected repository root: $RepoRoot" }
if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot '.git'))) { throw "Missing automation checkout: $RepoRoot" }

$logRoot = 'C:\codex_projekts\05-data\smartbolig-ai-news\logs'
$runsRoot = 'C:\codex_projekts\.automation\smartbolig-ai-news-runs'
New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
New-Item -ItemType Directory -Force -Path $runsRoot | Out-Null
$logPath = Join-Path $logRoot ("{0}-{1}.log" -f $Date, (Get-Date -Format 'HHmmss'))
$mutex = New-Object Threading.Mutex($false, 'Global\SharkSmartboligAiNews')
$lockTaken = $false
$runRoot = $null
$removeRunRoot = $false
$stage = 'startup'
$exitCode = 0

Start-Transcript -Path $logPath -Force | Out-Null
try {
    $lockTaken = $mutex.WaitOne(0)
    if (-not $lockTaken) { throw 'Another SmartBolig AI News run is already active' }
    Assert-Preflight
    if ($Preflight) { return }

    $stage = 'repository-sync'
    Invoke-Native git -C $RepoRoot fetch origin main --prune
    $baseCommit = (& git -C $RepoRoot rev-parse origin/main).Trim()
    if ($LASTEXITCODE -ne 0 -or $baseCommit -notmatch '^[a-f0-9]{40}$') { throw 'Could not resolve origin/main' }
    $runName = "{0}-{1}-{2}" -f $Date, $PID, (Get-Date -Format 'yyyyMMddHHmmss')
    $runRoot = [IO.Path]::GetFullPath((Join-Path $runsRoot $runName))
    $runsPrefix = [IO.Path]::GetFullPath($runsRoot).TrimEnd('\') + '\'
    if (-not $runRoot.StartsWith($runsPrefix, [StringComparison]::OrdinalIgnoreCase)) { throw "Refusing unexpected run path: $runRoot" }
    Invoke-Native git -C $RepoRoot worktree add --detach $runRoot $baseCommit
    Set-Location -LiteralPath $runRoot

    $retryState = & node scripts/ai-news-retry-state.mjs --date $Date | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) { throw 'Could not determine the post-merge retry state' }
    if ($retryState.action -eq 'resume-public-verification') {
        $stage = 'retry-main-deploy'
        Wait-GitHubRun -Commit $baseCommit -Event push -ExpectedRef main -Phase 'retry-main-deploy' | Out-Null
        $stage = 'public-verification'
        Wait-PublicIssue -IssueDate $Date -IssueFingerprint $retryState.issueFingerprint
        Write-Host "AI_NEWS_STATUS=already-published date=$Date fingerprint=$($retryState.issueFingerprint)"
        $removeRunRoot = $true
        return
    }

    $stage = 'dependencies-and-sources'
    Invoke-Native npm ci
    Invoke-Native npm audit --audit-level=high
    Invoke-Native npm run ai-news:source-health

    $stage = 'draft-generation'
    $resultPath = Join-Path $env:TEMP "smartbolig-ai-news-$Date-$PID.json"
    $env:AI_NEWS_RESULT_PATH = $resultPath
    $env:AI_NEWS_DISABLE_AI = '1'
    try {
        # --require-llm enables generation and semantic review for this command.
        # Process-wide LLM flags would make subsequent fixture tests call Claude.
        Invoke-Native node scripts/ai-news-publish.mjs --write --require-llm --date $Date --days 10 --max-items 4
        $result = Get-Content -Raw -LiteralPath $resultPath | ConvertFrom-Json
    } finally {
        Remove-Item Env:AI_NEWS_RESULT_PATH -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $resultPath -Force -ErrorAction SilentlyContinue
    }
    if ($result.status -eq 'skip') {
        Write-Host "AI_NEWS_STATUS=skip reason=$($result.reason)"
        $removeRunRoot = $true
        return
    }
    if ($result.status -ne 'publish' -or $result.copySource -ne 'llm' -or $result.semanticReview -ne 'passed' -or $result.storyFingerprint -notmatch '^[a-f0-9]{64}$' -or $result.issueFingerprint -notmatch '^[a-f0-9]{64}$') {
        throw "Generator returned an unsafe result: status=$($result.status), copySource=$($result.copySource), semanticReview=$($result.semanticReview)"
    }

    $stage = 'image-rendering'
    Invoke-Native node scripts/ai-news-render-image.mjs --date $Date
    Invoke-Native npm run images:news-thumbs

    $stage = 'quality-gates'
    Invoke-Native npm run ai-news:test
    Invoke-Native npm run ai-news:validate
    Invoke-Native npm run ai-news:quality -- --date $Date
    Invoke-Native node scripts/ai-news-pending-images.mjs --date $Date --fail-on-pending
    Invoke-Native npm run site:test
    Invoke-Native npm run build
    Invoke-Native npm run seo:validate

    if (-not (& git status --porcelain)) {
        $stage = 'public-verification'
        Wait-PublicIssue -IssueDate $Date -IssueFingerprint $result.issueFingerprint
        Write-Host "AI_NEWS_STATUS=already-published date=$Date fingerprint=$($result.issueFingerprint)"
        $removeRunRoot = $true
        return
    }
    if ($DryRun) {
        Write-Host "AI_NEWS_STATUS=dry-run run_root=$runRoot; no commit, push, PR, merge, or deploy was performed."
        git status --short
        return
    }

    $stage = 'github-publish'
    $branch = "ai-news/$Date-$($result.storyFingerprint.Substring(0, 12))"
    $allowedPaths = @(
        "src/content/docs/da/ai/nyheder/$Date.mdx",
        "src/content/docs/en/ai/nyheder/$Date.mdx",
        'src/content/docs/da/ai/nyheder/index.mdx',
        'src/content/docs/en/ai/nyheder/index.mdx',
        "public/images/ai-news/$Date.jpg",
        "public/images/ai-news/$Date-16x9.jpg",
        "public/images/ai-news/$Date-4x3.jpg",
        "public/images/ai-news/$Date-1x1.jpg",
        "public/images/ai-news/$Date-thumb.webp"
    )
    $changedPaths = @(& git status --porcelain | ForEach-Object { $_.Substring(3).Replace('\', '/') })
    $unexpectedPaths = @($changedPaths | Where-Object { $_ -notin $allowedPaths })
    if ($unexpectedPaths.Count -gt 0) { throw "Unexpected generated paths: $($unexpectedPaths -join ', ')" }
    Invoke-Native git add -- $allowedPaths
    $stagedPaths = @(& git diff --cached --name-only)
    if ($stagedPaths.Count -eq 0 -or @($stagedPaths | Where-Object { $_ -notin $allowedPaths }).Count -gt 0) { throw 'Staged path allowlist verification failed' }
    Invoke-Native git commit -m "feat(ai-news): publish $Date brief"
    $prCommit = (& git rev-parse HEAD).Trim()
    $prJson = & gh pr list --repo Hovborg/smartbolig-starlight --state open --head $branch --json 'url,headRefOid'
    if ($LASTEXITCODE -ne 0) { throw 'Could not look for an existing AI News pull request' }
    $prs = @($prJson | ConvertFrom-Json)
    if ($prs.Count -gt 1) { throw "Multiple open PRs found for deterministic branch $branch" }
    $remoteLine = (@(& git ls-remote --heads origin "refs/heads/$branch") -join "`n").Trim()
    if ($LASTEXITCODE -ne 0) { throw "Could not inspect remote branch: $branch" }
    if ($prs.Count -eq 1) {
        $prUrl = $prs[0].url
        if (-not $remoteLine) { throw "Existing PR has no remote branch: $branch" }
        $remoteOid = ($remoteLine -split '\s+')[0]
        Invoke-Native git push "--force-with-lease=refs/heads/$branch`:$remoteOid" --set-upstream origin "HEAD:refs/heads/$branch"
    } else {
        if ($remoteLine) {
            $remoteOid = ($remoteLine -split '\s+')[0]
            Invoke-Native git push "--force-with-lease=refs/heads/$branch`:$remoteOid" --set-upstream origin "HEAD:refs/heads/$branch"
        } else {
            Invoke-Native git push --set-upstream origin "HEAD:refs/heads/$branch"
        }
        $prUrl = & gh pr create --repo Hovborg/smartbolig-starlight --base main --head $branch --title "Publish AI news for $Date" --body "Automated bilingual AI News brief generated with isolated LLM copy and an independent source-grounded semantic review. It passed source, content, image, site, build, and SEO gates. This PR merges automatically only after GitHub Actions validation passes."
        if ($LASTEXITCODE -ne 0 -or -not $prUrl) { throw 'Could not create the AI News pull request' }
    }
    Write-Host "PR_READY $prUrl"

    Wait-GitHubRun -Commit $prCommit -Event pull_request -ExpectedRef $branch -Phase 'pull-request' | Out-Null
    $prState = & gh pr view $prUrl --repo Hovborg/smartbolig-starlight --json 'headRefOid,baseRefName,state' | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0 -or $prState.state -ne 'OPEN' -or $prState.baseRefName -ne 'main' -or $prState.headRefOid -ne $prCommit) {
        throw "PR identity changed after validation: expected_head=$prCommit actual_head=$($prState.headRefOid) base=$($prState.baseRefName) state=$($prState.state)"
    }
    Invoke-Native gh pr merge $prUrl --repo Hovborg/smartbolig-starlight --squash --delete-branch --match-head-commit $prCommit
    $mergeCommit = (& gh pr view $prUrl --repo Hovborg/smartbolig-starlight --json mergeCommit --jq '.mergeCommit.oid').Trim()
    if ($LASTEXITCODE -ne 0 -or -not $mergeCommit) { throw 'Merged PR has no merge commit' }

    $stage = 'cloudflare-deploy'
    Wait-GitHubRun -Commit $mergeCommit -Event push -ExpectedRef main -Phase 'main-deploy' | Out-Null
    $stage = 'public-verification'
    Wait-PublicIssue -IssueDate $Date -IssueFingerprint $result.issueFingerprint
    Write-Host "AI_NEWS_STATUS=published date=$Date pr=$prUrl commit=$mergeCommit"
    $removeRunRoot = $true
} catch {
    $exitCode = 1
    [Console]::Error.WriteLine("AI_NEWS_FAILED stage=$stage date=$Date run_root=$runRoot error=$($_.Exception.Message)")
} finally {
    Set-Location -LiteralPath $RepoRoot
    if ($removeRunRoot -and $runRoot) {
        $resolvedRunRoot = [IO.Path]::GetFullPath($runRoot)
        $runsPrefix = [IO.Path]::GetFullPath($runsRoot).TrimEnd('\') + '\'
        if (-not $resolvedRunRoot.StartsWith($runsPrefix, [StringComparison]::OrdinalIgnoreCase)) { throw "Refusing to remove unexpected run path: $resolvedRunRoot" }
        & git -C $RepoRoot worktree remove --force $resolvedRunRoot
        if ($LASTEXITCODE -ne 0) { [Console]::Error.WriteLine("Could not remove completed run worktree: $resolvedRunRoot") }
        & git -C $RepoRoot worktree prune
    }
    if ($lockTaken) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
    Stop-Transcript | Out-Null
}

exit $exitCode
