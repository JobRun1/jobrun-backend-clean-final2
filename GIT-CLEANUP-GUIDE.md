# Git Cleanup Guide - JobRun Production Deployment

## Overview

This guide documents the Git cleanup procedure required to prepare the JobRun monorepo for production deployment. The repository had accidentally tracked files that should never be in version control.

## Problem Statement

The following files were incorrectly tracked in Git:

- **Build outputs**: `dist/`, `.next/`, `build/`
- **Dependencies**: `node_modules/` across all packages
- **Environment files**: `.env`, `.env.local`
- **Temporary files**: `backend-log.txt`, `temp-dashboard/`
- **OS ghost files**: `nul`, `con`, `prn`, `aux`
- **Prisma temp files**: `*.node.tmp*`

These files bloat the repository, expose sensitive data, and create merge conflicts.

## Solution

### Files Created

1. **`.gitignore`** - Comprehensive ignore rules for Node.js monorepo
2. **`git-cleanup.ps1`** - PowerShell cleanup script (Windows)
3. **`git-cleanup.sh`** - Bash cleanup script (Linux/Mac)

### How to Run

#### Windows (PowerShell)

```powershell
.\git-cleanup.ps1
```

#### Linux/Mac (Bash)

```bash
chmod +x git-cleanup.sh
./git-cleanup.sh
```

### What the Script Does

The cleanup script performs the following steps **safely**:

1. **Removes tracked `node_modules/`** from Git index
   - Root `node_modules/`
   - `apps/backend/node_modules/`
   - `apps/dashboard/node_modules/`

2. **Removes tracked build outputs** from Git index
   - `dist/` folders
   - `apps/dashboard/.next/`
   - `build/` folders

3. **Removes tracked environment files** from Git index
   - `.env`
   - `.env.local`
   - `apps/backend/.env`
   - `apps/dashboard/.env.local`

4. **Removes OS ghost files** from Git index
   - `nul`, `con`, `prn`, `aux`, `com1`, `lpt1`

5. **Removes temporary files** from Git index
   - `temp-dashboard/`
   - `backend-log.txt`
   - Prisma temp files (`*.node.tmp*`)

6. **Stages updated `.gitignore`**

7. **Commits the cleanup** with descriptive message

8. **Verifies** no problematic files remain in Git index

### Safety Features

- **Working directory files are preserved** - only Git tracking is removed
- **Interactive confirmation** - asks before proceeding
- **Error suppression** - won't fail if files don't exist
- **Verification step** - checks for remaining issues

## New .gitignore Rules

The updated `.gitignore` includes:

```gitignore
# Node.js
node_modules/
*.log

# Environment Variables
.env
.env.local
*.env

# Build outputs
dist/
build/
out/
.next/

# OS Files
nul
con
prn
aux
.DS_Store

# Prisma temp files
*.node.tmp*

# Temp files
temp/
temp-*/
```

## Post-Cleanup Verification

After running the script, verify the cleanup:

```bash
# Check Git status
git status

# Verify no ignored files are tracked
git ls-files | grep -E "node_modules|dist|\.next|\.env"

# Review the commit
git show HEAD

# Check .gitignore
cat .gitignore
```

Expected output:
- No `node_modules/` in `git ls-files`
- No `dist/` or `.next/` in `git ls-files`
- No `.env` files in `git ls-files`
- Clean `git status` (or only intentional changes)

## Deployment Checklist

- [ ] Run cleanup script
- [ ] Verify no sensitive files in Git index
- [ ] Review commit message
- [ ] Push to remote: `git push origin main`
- [ ] Verify Railway/production environment variables are set
- [ ] Run database migrations: `npx prisma migrate deploy`
- [ ] Test build process: `npm run build`
- [ ] Deploy to staging
- [ ] Manual SMS testing
- [ ] Deploy to production

## Environment Variables Required

Ensure these are set in Railway/production (NOT in Git):

```bash
DATABASE_URL=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_NUMBER=
DEFAULT_CLIENT_ID=
FRONTEND_URL=
JWT_SECRET=
OPENAI_API_KEY=
```

## Important Notes

1. **This cleanup is a one-time operation** - future commits will automatically respect `.gitignore`

2. **Working directory files are safe** - `git rm --cached` only removes from Git index

3. **Existing .env files remain on disk** - they're just no longer tracked

4. **After cleanup, reinstall dependencies**:
   ```bash
   npm install
   cd apps/backend && npm install
   cd apps/dashboard && npm install
   ```

5. **Do NOT commit `.env` files** - they contain secrets

6. **Prisma migrations** - ensure migration files are committed but NOT the generated client

## Troubleshooting

### Script says "files may still be tracked"

Run manual cleanup:
```bash
git rm -r --cached node_modules/
git rm --cached .env
git commit -m "chore: additional cleanup"
```

### "fatal: pathspec did not match any files"

This is normal - it means the file wasn't tracked in the first place.

### Working directory files deleted

This should NOT happen. The script uses `--cached` flag. If this occurs:
```bash
git checkout HEAD -- <file>
```

## Repository Size

Before cleanup: ~XXX MB (with node_modules)
After cleanup: ~X MB (source code only)

## Support

If issues arise during cleanup:

1. Check `git status` to see current state
2. Review `git log` to see what was committed
3. Use `git reset --soft HEAD~1` to undo the cleanup commit (preserves changes)
4. Contact DevOps team for assistance

---

**Generated**: 2025-12-11
**Purpose**: Production deployment preparation
**Status**: Ready for execution
