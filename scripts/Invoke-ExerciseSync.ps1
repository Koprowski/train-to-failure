param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("local", "staging", "production")]
    [string]$EnvironmentName,

    [switch]$Apply,

    [string]$Remove,

    [string]$Workbook = "OneFootExerciseList.xlsx"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir

. (Join-Path $scriptDir "Load-DotEnv.ps1")

$envFileMap = @{
    local = Join-Path $repoRoot ".env.local"
    staging = Join-Path $repoRoot ".env.staging"
    production = Join-Path $repoRoot ".env.production"
}

$envFile = $envFileMap[$EnvironmentName]
if ($EnvironmentName -eq "local" -and -not (Test-Path -LiteralPath $envFile)) {
    $fallbackEnv = Join-Path $repoRoot ".env"
    if (Test-Path -LiteralPath $fallbackEnv) {
        Write-Warning ".env.local was not found. Falling back to .env for local sync."
        $envFile = $fallbackEnv
    }
}

Import-DotEnvFile -Path $envFile

$workbookPath = Join-Path $repoRoot $Workbook
if (-not (Test-Path -LiteralPath $workbookPath)) {
    throw "Workbook not found: $workbookPath"
}

$args = @("scripts/sync_exercise_library.py", "--workbook", $workbookPath)

if ($Apply) {
    $args += "--apply"
} else {
    $args += "--dry-run"
}

if ($Remove) {
    $args += @("--remove", $Remove)
}

Write-Host "Environment: $EnvironmentName"
Write-Host "Env file: $envFile"
Write-Host "Workbook: $workbookPath"
Write-Host "Mode: $(if ($Apply) { "apply" } else { "dry-run" })"
if ($Remove) {
    Write-Host "Remove: $Remove"
}

Push-Location $repoRoot
try {
    & python @args
    if ($LASTEXITCODE -ne 0) {
        throw "Exercise sync failed with exit code $LASTEXITCODE"
    }
} finally {
    Pop-Location
}
