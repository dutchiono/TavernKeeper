# PowerShell script to verify all mainnet contracts
#
# Usage:
#   .\verify-all-mainnet.ps1
#
# Prerequisites:
#   - Set NEXT_PUBLIC_MONAD_CHAIN_ID=143
#   - Set ETHERSCAN_API_KEY in .env or environment

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Batch Verify All Mainnet Contracts" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check environment variables
if (-not $env:NEXT_PUBLIC_MONAD_CHAIN_ID -or $env:NEXT_PUBLIC_MONAD_CHAIN_ID -ne "143") {
    Write-Host "Setting NEXT_PUBLIC_MONAD_CHAIN_ID=143..." -ForegroundColor Yellow
    $env:NEXT_PUBLIC_MONAD_CHAIN_ID = "143"
}

if (-not $env:ETHERSCAN_API_KEY -or $env:ETHERSCAN_API_KEY -eq "empty") {
    Write-Host "ERROR: ETHERSCAN_API_KEY not set!" -ForegroundColor Red
    Write-Host "Set ETHERSCAN_API_KEY in .env file or environment" -ForegroundColor Red
    exit 1
}

Write-Host "Network: Monad Mainnet (Chain ID: 143)" -ForegroundColor Green
Write-Host "API Key: Configured" -ForegroundColor Green
Write-Host ""

# Change to contracts directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$contractsDir = Join-Path $scriptPath ".."
Set-Location $contractsDir

Write-Host "Running verification script..." -ForegroundColor Cyan
Write-Host ""

# Run the TypeScript verification script
try {
    npx hardhat run scripts/verify_all_mainnet.ts --network monad
    $exitCode = $LASTEXITCODE

    if ($exitCode -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "Verification process completed!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Red
        Write-Host "Verification process completed with errors" -ForegroundColor Red
        Write-Host "Check the output above for details" -ForegroundColor Red
        Write-Host "========================================" -ForegroundColor Red
    }

    exit $exitCode
} catch {
    Write-Host ""
    Write-Host "ERROR: Failed to run verification script" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

