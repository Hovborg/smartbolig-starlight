[CmdletBinding()]
param(
    [string]$TaskName = 'Shark Smartbolig AI News',
    [string]$UserId = $env:USERNAME,
    [string]$RepoRoot = 'C:\codex_projekts\.automation\smartbolig-ai-news'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = [IO.Path]::GetFullPath($RepoRoot)
$expectedRoot = 'C:\codex_projekts\.automation\smartbolig-ai-news'
if ($RepoRoot -ne $expectedRoot) { throw "Refusing unexpected repository root: $RepoRoot" }
$runner = Join-Path $RepoRoot 'scripts\smartbolig-ai-news-daily.ps1'
if (-not (Test-Path -LiteralPath $runner)) { throw "Missing runner in the dedicated automation checkout: $runner" }

$powerShell = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$arguments = "-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$runner`" -RepoRoot `"$RepoRoot`""
$action = New-ScheduledTaskAction -Execute $powerShell -Argument $arguments -WorkingDirectory $RepoRoot
$trigger = New-ScheduledTaskTrigger -Daily -At '07:20'
# Interactive uses the owner's GitHub and Claude OAuth sessions. Combined with
# StartWhenAvailable this runs after login if the PC was asleep or signed out at
# 07:20. S4U cannot reliably access these protected credentials.
$principal = New-ScheduledTaskPrincipal -UserId $UserId -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 3) -RestartCount 2 -RestartInterval (New-TimeSpan -Minutes 15)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Generates, independently reviews, validates, merges, deploys, and publicly verifies bilingual SmartBolig.net AI News.' -Force -ErrorAction Stop | Out-Null
$task = Get-ScheduledTask -TaskName $TaskName
$info = Get-ScheduledTaskInfo -TaskName $TaskName
[pscustomobject]@{
    TaskName = $task.TaskName
    State = $task.State
    UserId = $task.Principal.UserId
    LogonType = $task.Principal.LogonType
    NextRunTime = $info.NextRunTime
    Execute = $task.Actions.Execute
    Arguments = $task.Actions.Arguments
} | Format-List
