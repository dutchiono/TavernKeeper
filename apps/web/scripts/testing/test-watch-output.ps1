# PowerShell script to run tests in watch mode and continuously update output files
param(
    [string]$Type = "unit"
)

$TestResultsDir = "test-results"
New-Item -ItemType Directory -Force -Path $TestResultsDir | Out-Null

if ($Type -eq "unit") {
    Write-Host "Running unit tests in watch mode. Output: $TestResultsDir/vitest-live.txt"
    Write-Host "File will be updated continuously. Press Ctrl+C to stop."
    # Use Tee-Object to both display and write to file (overwrites on first write)
    pnpm vitest --watch 2>&1 | Tee-Object -FilePath "$TestResultsDir/vitest-live.txt"
} elseif ($Type -eq "e2e") {
    Write-Host "Running E2E tests in UI mode. Output: $TestResultsDir/playwright-live.txt"
    Write-Host "File will be updated continuously. Press Ctrl+C to stop."
    pnpm playwright test --ui 2>&1 | Tee-Object -FilePath "$TestResultsDir/playwright-live.txt"
} else {
    Write-Host "Usage: .\scripts\test-watch-output.ps1 [unit|e2e]"
}

