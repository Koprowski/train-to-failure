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

function Test-GitFreshness {
    param(
        [string]$RepoRoot,
        [bool]$IsApply
    )

    $insideRepo = (& git -C $RepoRoot rev-parse --is-inside-work-tree 2>$null)
    if ($LASTEXITCODE -ne 0 -or $insideRepo.Trim() -ne "true") {
        return
    }

    & git -C $RepoRoot fetch origin --quiet
    if ($LASTEXITCODE -ne 0) {
        throw "Git fetch failed. Resolve Git connectivity before running sync."
    }

    $branchName = (& git -C $RepoRoot rev-parse --abbrev-ref HEAD).Trim()
    $upstreamRef = (& git -C $RepoRoot rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2>$null).Trim()
    if ($LASTEXITCODE -ne 0 -or -not $upstreamRef) {
        return
    }

    $counts = [regex]::Split(
        (& git -C $RepoRoot rev-list --left-right --count "$upstreamRef...HEAD").Trim(),
        "\s+"
    ) | Where-Object { $_ }
    if ($counts.Count -lt 2) {
        return
    }

    $behind = [int]$counts[0]
    $ahead = [int]$counts[1]

    if ($behind -gt 0) {
        $message = "Local branch '$branchName' is behind $upstreamRef by $behind commit(s). Pull/merge remote changes before running sync apply."
        if ($IsApply) {
            throw $message
        }

        Write-Warning $message
    } elseif ($ahead -gt 0) {
        Write-Host "Git preflight: '$branchName' is ahead of $upstreamRef by $ahead commit(s)." -ForegroundColor Yellow
    } else {
        Write-Host "Git preflight: '$branchName' is up to date with $upstreamRef."
    }
}

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
    Test-GitFreshness -RepoRoot $repoRoot -IsApply $Apply

    & python @args
    if ($LASTEXITCODE -ne 0) {
        throw "Exercise sync failed with exit code $LASTEXITCODE"
    }

    if ($Apply) {
        $status = & git -C $repoRoot status --porcelain
        if ($status) {
            Write-Host "`nCommitting and pushing sync changes..." -ForegroundColor Cyan
            & git -C $repoRoot add public/gifs/ src/lib/seed-exercises.ts prisma/seed.ts OneFootExerciseList.xlsx
            & git -C $repoRoot commit -m "Sync exercise library from workbook"
            if ($LASTEXITCODE -ne 0) {
                throw "Git commit failed."
            }
            & git -C $repoRoot push
            if ($LASTEXITCODE -ne 0) {
                throw "Git push failed."
            }
            Write-Host "Pushed to origin." -ForegroundColor Green
        } else {
            Write-Host "`nNo git changes to commit." -ForegroundColor Gray
        }
    }
} finally {
    Pop-Location
}
