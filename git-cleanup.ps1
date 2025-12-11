# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# JobRun Git Cleanup Script (PowerShell)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Purpose: Remove accidentally tracked files from Git index
# Safe: Preserves working directory files, only cleans Git tracking
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🧹 JobRun Git Cleanup - Starting" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Safety check - confirm with user
Write-Host "⚠️  This script will:" -ForegroundColor Yellow
Write-Host "   - Remove tracked build outputs (dist/, .next/)" -ForegroundColor Yellow
Write-Host "   - Remove tracked dependencies (node_modules/)" -ForegroundColor Yellow
Write-Host "   - Remove tracked environment files (.env*)" -ForegroundColor Yellow
Write-Host "   - Remove OS ghost files (nul, con, etc.)" -ForegroundColor Yellow
Write-Host "   - Update .gitignore" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ Your working directory files will NOT be deleted" -ForegroundColor Green
Write-Host "✅ Only Git tracking will be cleaned" -ForegroundColor Green
Write-Host ""

$confirmation = Read-Host "Continue? (y/n)"
if ($confirmation -ne 'y') {
    Write-Host "❌ Cleanup cancelled" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 1: Removing tracked node_modules/" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

git rm -r --cached node_modules/ 2>$null
git rm -r --cached apps/backend/node_modules/ 2>$null
git rm -r --cached apps/dashboard/node_modules/ 2>$null

Write-Host "✅ node_modules/ untracked" -ForegroundColor Green
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 2: Removing tracked dist/ and build outputs" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

git rm -r --cached dist/ 2>$null
git rm -r --cached build/ 2>$null
git rm -r --cached apps/backend/dist/ 2>$null
git rm -r --cached apps/dashboard/.next/ 2>$null
git rm -r --cached apps/dashboard/out/ 2>$null

Write-Host "✅ Build outputs untracked" -ForegroundColor Green
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 3: Removing tracked .env files" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

git rm --cached .env 2>$null
git rm --cached .env.local 2>$null
git rm --cached apps/backend/.env 2>$null
git rm --cached apps/dashboard/.env.local 2>$null

Write-Host "✅ Environment files untracked" -ForegroundColor Green
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 4: Removing OS ghost files" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

git rm --cached nul 2>$null
git rm --cached con 2>$null
git rm --cached prn 2>$null
git rm --cached aux 2>$null
git rm --cached com1 2>$null
git rm --cached lpt1 2>$null

Write-Host "✅ OS ghost files removed" -ForegroundColor Green
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 5: Removing temp files and logs" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

git rm -r --cached temp-dashboard/ 2>$null
git rm --cached apps/backend/backend-log.txt 2>$null
git rm --cached apps/backend/node_modules/.prisma/client/*.tmp* 2>$null

Write-Host "✅ Temp files untracked" -ForegroundColor Green
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 6: Staging .gitignore" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

git add .gitignore

Write-Host "✅ .gitignore staged" -ForegroundColor Green
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 7: Committing cleanup" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

git commit -m "chore: clean Git index - remove build outputs, dependencies, env files

- Untrack node_modules/ from all packages
- Untrack dist/, .next/, build/ outputs
- Untrack .env and .env.local files
- Remove OS ghost files (nul, con, etc.)
- Update .gitignore for production deployment
- Preserve working directory files

This commit prepares the repository for production deployment by
removing accidentally tracked files that should never be in Git."

Write-Host "✅ Cleanup committed" -ForegroundColor Green
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 8: Verification" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

Write-Host ""
Write-Host "Checking for remaining tracked files that should be ignored..." -ForegroundColor Yellow
Write-Host ""

$trackedFiles = git ls-files | Select-String -Pattern "node_modules/|dist/|\.next/|\.env|nul|con|prn|aux"

if ($trackedFiles) {
    Write-Host "⚠️  Some files may still be tracked:" -ForegroundColor Yellow
    $trackedFiles | ForEach-Object { Write-Host "   $_" -ForegroundColor Yellow }
} else {
    Write-Host "✅ No problematic files found in Git index" -ForegroundColor Green
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🎉 Git Cleanup Complete" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Review the commit: git show HEAD" -ForegroundColor White
Write-Host "2. Check working directory: git status" -ForegroundColor White
Write-Host "3. Verify .gitignore: cat .gitignore" -ForegroundColor White
Write-Host "4. Push to remote: git push origin main" -ForegroundColor White
Write-Host ""
