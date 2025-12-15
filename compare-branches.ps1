# Compare main vs backup branch
$env:GIT_PAGER = ""
$env:PAGER = ""

Write-Host "Comparing main vs backup-my-work-20250115..." -ForegroundColor Cyan
Write-Host ""

# Get commit differences
Write-Host "=== COMMITS IN BACKUP BUT NOT IN MAIN ===" -ForegroundColor Yellow
git log main..backup-my-work-20250115 --oneline --no-pager | Out-File -FilePath "branch-diff-commits.txt" -Encoding utf8
Get-Content "branch-diff-commits.txt" | Write-Host

Write-Host "`n=== FILES CHANGED ===" -ForegroundColor Yellow
git diff main..backup-my-work-20250115 --name-only --no-pager | Out-File -FilePath "branch-diff-files.txt" -Encoding utf8
Get-Content "branch-diff-files.txt" | Write-Host

Write-Host "`n=== SUMMARY ===" -ForegroundColor Yellow
$fileCount = (Get-Content "branch-diff-files.txt" | Measure-Object -Line).Lines
Write-Host "Total files changed: $fileCount" -ForegroundColor Green

Write-Host "`nDetailed diff saved to: branch-diff-detailed.txt" -ForegroundColor Cyan
git diff main..backup-my-work-20250115 --no-pager | Out-File -FilePath "branch-diff-detailed.txt" -Encoding utf8

Write-Host "Done! Check the .txt files for details." -ForegroundColor Green

