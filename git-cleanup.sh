#!/bin/bash

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# JobRun Git Cleanup Script (Bash)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Purpose: Remove accidentally tracked files from Git index
# Safe: Preserves working directory files, only cleans Git tracking
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧹 JobRun Git Cleanup - Starting"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Safety check - confirm with user
echo "⚠️  This script will:"
echo "   - Remove tracked build outputs (dist/, .next/)"
echo "   - Remove tracked dependencies (node_modules/)"
echo "   - Remove tracked environment files (.env*)"
echo "   - Remove OS ghost files (nul, con, etc.)"
echo "   - Update .gitignore"
echo ""
echo "✅ Your working directory files will NOT be deleted"
echo "✅ Only Git tracking will be cleaned"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cleanup cancelled"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Removing tracked node_modules/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

git rm -r --cached node_modules/ 2>/dev/null || true
git rm -r --cached apps/backend/node_modules/ 2>/dev/null || true
git rm -r --cached apps/dashboard/node_modules/ 2>/dev/null || true

echo "✅ node_modules/ untracked"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Removing tracked dist/ and build outputs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

git rm -r --cached dist/ 2>/dev/null || true
git rm -r --cached build/ 2>/dev/null || true
git rm -r --cached apps/backend/dist/ 2>/dev/null || true
git rm -r --cached apps/dashboard/.next/ 2>/dev/null || true
git rm -r --cached apps/dashboard/out/ 2>/dev/null || true

echo "✅ Build outputs untracked"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Removing tracked .env files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

git rm --cached .env 2>/dev/null || true
git rm --cached .env.local 2>/dev/null || true
git rm --cached apps/backend/.env 2>/dev/null || true
git rm --cached apps/dashboard/.env.local 2>/dev/null || true

echo "✅ Environment files untracked"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Removing OS ghost files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

git rm --cached nul 2>/dev/null || true
git rm --cached con 2>/dev/null || true
git rm --cached prn 2>/dev/null || true
git rm --cached aux 2>/dev/null || true
git rm --cached com1 2>/dev/null || true
git rm --cached lpt1 2>/dev/null || true

echo "✅ OS ghost files removed"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5: Removing temp files and logs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

git rm -r --cached temp-dashboard/ 2>/dev/null || true
git rm --cached apps/backend/backend-log.txt 2>/dev/null || true
git rm --cached apps/backend/node_modules/.prisma/client/*.tmp* 2>/dev/null || true

echo "✅ Temp files untracked"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 6: Staging .gitignore"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

git add .gitignore

echo "✅ .gitignore staged"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 7: Committing cleanup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

git commit -m "chore: clean Git index - remove build outputs, dependencies, env files

- Untrack node_modules/ from all packages
- Untrack dist/, .next/, build/ outputs
- Untrack .env and .env.local files
- Remove OS ghost files (nul, con, etc.)
- Update .gitignore for production deployment
- Preserve working directory files

This commit prepares the repository for production deployment by
removing accidentally tracked files that should never be in Git."

echo "✅ Cleanup committed"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 8: Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "Checking for remaining tracked files that should be ignored..."
echo ""

TRACKED_FILES=$(git ls-files | grep -E "node_modules/|dist/|\.next/|\.env|nul|con|prn|aux" || true)

if [ -n "$TRACKED_FILES" ]; then
    echo "⚠️  Some files may still be tracked:"
    echo "$TRACKED_FILES"
else
    echo "✅ No problematic files found in Git index"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Git Cleanup Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. Review the commit: git show HEAD"
echo "2. Check working directory: git status"
echo "3. Verify .gitignore: cat .gitignore"
echo "4. Push to remote: git push origin main"
echo ""
