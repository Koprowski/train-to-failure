param(
    [switch]$Apply,
    [string]$Remove,
    [string]$Workbook = "OneFootExerciseList.xlsx",
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$RemainingArgs
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

for ($i = 0; $i -lt $RemainingArgs.Count; $i++) {
    $arg = $RemainingArgs[$i]
    switch -Regex ($arg) {
        '^--apply$' {
            $Apply = $true
            continue
        }
        '^--remove=(.+)$' {
            $Remove = $Matches[1]
            continue
        }
        '^--remove$' {
            if ($i + 1 -lt $RemainingArgs.Count) {
                $Remove = $RemainingArgs[$i + 1]
                $i++
            }
            continue
        }
        '^--workbook=(.+)$' {
            $Workbook = $Matches[1]
            continue
        }
        '^--workbook$' {
            if ($i + 1 -lt $RemainingArgs.Count) {
                $Workbook = $RemainingArgs[$i + 1]
                $i++
            }
            continue
        }
    }
}

& (Join-Path $scriptDir "Invoke-ExerciseSync.ps1") `
    -EnvironmentName "local" `
    -Apply:$Apply `
    -Remove $Remove `
    -Workbook $Workbook
