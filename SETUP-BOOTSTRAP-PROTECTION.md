# Bootstrap Protection Setup Guide

This guide walks through setting up bootstrap infrastructure protection for JobRun.

## Files Created

✅ **Step 1 files have been created:**

1. `.github/CODEOWNERS` — Requires approval for bootstrap file changes
2. `.husky/pre-commit` — Blocks dangerous commits locally
3. `.husky/_/husky.sh` — Husky helper script
4. `apps/backend/README.md` — Documentation with bootstrap warning
5. `apps/backend/package.json` — Updated with husky scripts

## Installation Steps

### 1. Install Husky

```bash
cd apps/backend
npm install
npm run prepare
```

This installs husky and sets up the git hooks.

### 2. Make Pre-commit Hook Executable

```bash
# On Unix/Mac:
chmod +x ../../.husky/pre-commit

# On Windows (Git Bash):
git update-index --chmod=+x .husky/pre-commit
```

### 3. Update CODEOWNERS with Your GitHub Username

Edit `.github/CODEOWNERS` and replace `@OWNER_GITHUB_USERNAME` with your actual GitHub username:

```
# Before:
apps/backend/prisma/migrations/*bootstrap* @OWNER_GITHUB_USERNAME

# After:
apps/backend/prisma/migrations/*bootstrap* @yourActualUsername
```

### 4. Configure GitHub Branch Protection

Go to: `https://github.com/YOUR_ORG/JobRun/settings/branches`

Click "Add rule" for branch `main`:

**Required settings:**
- ✅ Require pull request reviews before merging (minimum 1)
- ✅ Require status checks to pass before merging
  - Add required check: `bootstrap-survivability` (will be created in Step 3)
- ✅ Require branches to be up to date before merging
- ✅ Require conversation resolution before merging
- ✅ Include administrators (prevents bypassing rules)

Click "Create" to save.

### 5. Commit and Push Step 1 Files

```bash
git add .github/CODEOWNERS
git add .husky/
git add apps/backend/README.md
git add apps/backend/package.json
git commit -m "Add bootstrap infrastructure protection (Step 1)"
git push origin main
```

## Verification

### Test Pre-commit Hook

Try to delete the bootstrap migration (should be blocked):

```bash
cd apps/backend
git rm prisma/migrations/20251214120000_bootstrap_default_client/migration.sql
git commit -m "test: trying to delete bootstrap"
```

**Expected output:**
```
❌ BLOCKED: Cannot delete bootstrap migration
This file is production-critical infrastructure.
```

If you see this message, the pre-commit hook is working correctly.

Reset the test:
```bash
git reset HEAD
git checkout prisma/migrations/
```

### Test CODEOWNERS

1. Create a branch and modify bootstrap migration
2. Open a PR
3. You should see "Review required" from the CODEOWNER

### Verify Branch Protection

1. Try to push directly to `main` (should be blocked if branch protection is on)
2. Create a PR with failing tests
3. Merge should be blocked with "Required status checks must pass"

## Step 1 Completion Checklist

- [ ] Husky installed (`npm install` completed)
- [ ] Pre-commit hook executable (`chmod +x` or `git update-index`)
- [ ] CODEOWNERS updated with your GitHub username
- [ ] Branch protection rules active in GitHub
- [ ] README warning visible in `apps/backend/README.md`
- [ ] Pre-commit hook tested (blocks bootstrap deletion)
- [ ] All files committed and pushed to main

**Status after completion:** ✅ **Step 1 Complete — Ready for Step 2**

## What's Protected

The following files cannot be modified without:
1. Pre-commit hook approval (blocks locally)
2. CODEOWNERS approval (blocks in GitHub)
3. CI passing (blocks merge)

**Protected files:**
- `prisma/migrations/*bootstrap*/migration.sql`
- `src/index.ts` (validateDefaultClient function)
- `src/__tests__/bootstrap-survivability.test.ts`

## Next Steps

**After Step 1 is verified complete:**

Proceed to **Step 2: Runtime Contract**
- Create health check endpoint
- Add startup logging
- Implement metrics
- Deploy to Railway

See `STEP-2-RUNTIME-CONTRACT.md` for details.

## Troubleshooting

### Pre-commit hook not running

```bash
# Reinstall husky
cd apps/backend
rm -rf .husky
npm run prepare

# Make sure hook is executable
chmod +x ../../.husky/pre-commit
```

### CODEOWNERS not working

1. Verify file is at `.github/CODEOWNERS` (repository root)
2. Verify GitHub username is correct (with @ prefix)
3. Branch protection must be enabled for CODEOWNERS to enforce

### Branch protection bypassed

1. Go to Settings → Branches
2. Edit rule for `main`
3. Enable "Include administrators"
4. This prevents even admins from bypassing rules

## Emergency Override

**If you absolutely must bypass protection (incident recovery):**

```bash
# Bypass pre-commit hook (logged in git)
git commit --no-verify -m "EMERGENCY: reason for bypass"

# Force push (requires admin, logged in GitHub)
git push --force

# Document why in incident log
```

**Note:** All bypasses are auditable in git history and GitHub logs.
