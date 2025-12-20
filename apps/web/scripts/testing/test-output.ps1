# PowerShell script to run tests and output to files (overwrites each run)
param(
    [string]$Type = "all"
)

$TestResultsDir = "test-results"
New-Item -ItemType Directory -Force -Path $TestResultsDir | Out-Null

if ($Type -eq "unit" -or $Type -eq "all") {
    Write-Host "Running unit tests and writing to $TestResultsDir/vitest-output.txt..."
    # Overwrite file (don't append)
    pnpm vitest --run 2>&1 | Out-File -FilePath "$TestResultsDir/vitest-output.txt" -Encoding utf8
    Write-Host "Output written to $TestResultsDir/vitest-output.txt"
}

if ($Type -eq "e2e" -or $Type -eq "all") {
    Write-Host "Running E2E tests and writing to $TestResultsDir/playwright-output.txt..."
    # Overwrite file (don't append)
    pnpm playwright test 2>&1 | Out-File -FilePath "$TestResultsDir/playwright-output.txt" -Encoding utf8
    Write-Host "Output written to $TestResultsDir/playwright-output.txt"
}

