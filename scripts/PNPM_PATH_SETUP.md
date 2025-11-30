# Making pnpm Available Permanently in PowerShell

## Quick Solution

Run this command in PowerShell (as Administrator if needed):

```powershell
# Add npm's global bin directory to PATH permanently
$npmBin = (npm root -g | Split-Path -Parent)
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentPath -notlike "*$npmBin*") {
    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$npmBin", "User")
    Write-Host "Added to PATH: $npmBin" -ForegroundColor Green
}

# Also add AppData\npm (common location for pnpm on Windows)
$appDataNpm = "$env:APPDATA\npm"
if ($currentPath -notlike "*$appDataNpm*") {
    $updatedPath = [Environment]::GetEnvironmentVariable("Path", "User")
    [Environment]::SetEnvironmentVariable("Path", "$updatedPath;$appDataNpm", "User")
    Write-Host "Added to PATH: $appDataNpm" -ForegroundColor Green
}

# Update current session
$env:Path += ";$npmBin;$appDataNpm"
```

## Alternative: Manual Method

1. Open **System Properties**:
   - Press `Win + R`
   - Type `sysdm.cpl` and press Enter
   - Go to **Advanced** tab
   - Click **Environment Variables**

2. Under **User variables**, find and select **Path**, then click **Edit**

3. Click **New** and add these paths (if they don't exist):
   - `C:\Users\<YourUsername>\AppData\Roaming\npm`
   - The path shown by running: `npm config get prefix`

4. Click **OK** on all dialogs

5. **Restart your terminal/PowerShell** for changes to take effect

## Verify Installation

After restarting your terminal, run:
```powershell
pnpm --version
```

If it shows a version number, pnpm is now permanently available!

## Troubleshooting

If pnpm is still not found after restarting:

1. Check if pnpm is installed:
   ```powershell
   npm list -g pnpm
   ```

2. If not installed, install it:
   ```powershell
   npm install -g pnpm
   ```

3. Find where pnpm was installed:
   ```powershell
   Get-ChildItem -Path "$env:APPDATA\npm" -Filter "pnpm*"
   ```

4. Add that directory to PATH using the method above
