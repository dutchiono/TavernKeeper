# Run Playwright E2E tests and output to file
$outputFile = "test-results/playwright-output.txt"
$jsonFile = "test-results/playwright-results.json"

# Ensure directory exists
$dir = Split-Path -Parent $outputFile
if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
}

Write-Host "Running Playwright E2E tests..." -ForegroundColor Cyan
Write-Host "Output will be written to: $outputFile" -ForegroundColor Yellow
Write-Host "JSON results: $jsonFile" -ForegroundColor Yellow
Write-Host ""

# Run tests and capture ALL output (stdout + stderr)
# Overwrite file (don't append)
pnpm test:e2e 2>&1 | Out-File -FilePath $outputFile -Encoding utf8 -Force

# Check if JSON file was created
if (Test-Path $jsonFile) {
    Write-Host "`n✅ Test results written!" -ForegroundColor Green
    Write-Host "  - Text output: $outputFile" -ForegroundColor Cyan
    Write-Host "  - JSON results: $jsonFile" -ForegroundColor Cyan
    Write-Host "`nYou can show me either file to review test results!" -ForegroundColor Yellow
} else {
    Write-Host "`n⚠️  Tests may still be running or JSON file not created yet" -ForegroundColor Yellow
    Write-Host "  - Text output: $outputFile" -ForegroundColor Cyan
}

Write-Host ""

