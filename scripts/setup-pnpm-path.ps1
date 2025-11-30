# Script to add pnpm to PATH permanently
Write-Host "Setting up pnpm in PATH..." -ForegroundColor Cyan

# Get npm's global prefix (where global packages are installed)
$npmPrefix = npm config get prefix
Write-Host "npm prefix: $npmPrefix" -ForegroundColor Yellow

# Common locations for pnpm
$pathsToCheck = @(
    $npmPrefix,
    "$env:APPDATA\npm",
    "$env:LOCALAPPDATA\npm"
)

$pnpmFound = $false
$pnpmPath = $null

foreach ($path in $pathsToCheck) {
    $pnpmCmd = Join-Path $path "pnpm.cmd"
    $pnpmExe = Join-Path $path "pnpm.exe"

    if (Test-Path $pnpmCmd) {
        Write-Host "Found pnpm.cmd at: $pnpmCmd" -ForegroundColor Green
        $pnpmPath = $path
        $pnpmFound = $true
        break
    }
    elseif (Test-Path $pnpmExe) {
        Write-Host "Found pnpm.exe at: $pnpmExe" -ForegroundColor Green
        $pnpmPath = $path
        $pnpmFound = $true
        break
    }
}

if (-not $pnpmFound) {
    Write-Host "pnpm not found. Installing pnpm globally..." -ForegroundColor Yellow
    npm install -g pnpm

    # Check again after installation
    $pnpmCmd = Join-Path "$env:APPDATA\npm" "pnpm.cmd"
    if (Test-Path $pnpmCmd) {
        $pnpmPath = "$env:APPDATA\npm"
        $pnpmFound = $true
    }
}

if ($pnpmFound -and $pnpmPath) {
    # Get current user PATH
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")

    # Check if path is already in PATH
    if ($currentPath -like "*$pnpmPath*") {
        Write-Host "`nPATH already contains: $pnpmPath" -ForegroundColor Yellow
    } else {
        # Add to user PATH permanently
        $newPath = "$currentPath;$pnpmPath"
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        Write-Host "`nAdded to PATH permanently: $pnpmPath" -ForegroundColor Green

        # Also update current session
        $env:Path += ";$pnpmPath"
        Write-Host "Updated current session PATH" -ForegroundColor Green
    }

    Write-Host "`nVerifying pnpm is accessible..." -ForegroundColor Cyan
    $env:Path += ";$pnpmPath"
    $pnpmVersion = pnpm --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Success! pnpm version: $pnpmVersion" -ForegroundColor Green
        Write-Host "`nNote: You may need to restart your terminal for the PATH changes to take effect in new sessions." -ForegroundColor Yellow
    } else {
        Write-Host "pnpm command not yet available. Please restart your terminal." -ForegroundColor Yellow
    }
} else {
    Write-Host "Could not find or install pnpm. Please install it manually." -ForegroundColor Red
}
