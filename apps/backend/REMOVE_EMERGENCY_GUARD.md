# EMERGENCY GUARD REMOVAL - EXECUTION GUIDE

**Prerequisites** (ALL must be true):
- [x] Phase 5 migration applied successfully
- [x] Backend running without errors
- [x] NO `[ALERT_SUPPRESSED]` messages in logs for 10+ minutes
- [x] Alert deduplication verified working

---

## AUTOMATED REMOVAL

I will remove the guard for you using the Edit tool. This is safer than manual editing.

### What Will Be Removed

**File**: `apps/backend/src/services/AlertService.ts`

**Block 1** (Lines 135-154):
```typescript
// Emergency guard check at start of sendCriticalAlert()
const phase5SchemaLive = await this.checkPhase5SchemaExists();
if (!phase5SchemaLive) { ... }
```

**Block 2** (Lines 316-356):
```typescript
// Schema check method
private static async checkPhase5SchemaExists(): Promise<boolean> { ... }
```

---

## VERIFICATION AFTER REMOVAL

After I remove the guard, you must verify:

```bash
cd apps/backend

# 1. TypeScript compiles
npx tsc --noEmit
# Expected: No output

# 2. Rebuild
npm run build
# Expected: Build succeeds

# 3. Restart backend
npm run start

# 4. Watch logs for 5 minutes
# Expected:
# - NO "[ALERT_SUPPRESSED]" messages
# - NO "checkPhase5SchemaExists" function calls
# - Alerts work normally (if any fire)
```

---

## IF REMOVAL BREAKS SOMETHING

```bash
# Restore guard immediately
git checkout apps/backend/src/services/AlertService.ts

# Rebuild and restart
npm run build && npm run start

# Investigate what broke:
# - Check logs for errors
# - Verify migration status: npx prisma migrate status
# - Verify schema: run verification queries from PHASE_5_DEPLOYMENT_COMMANDS.md
```

---

## COMMIT AFTER SUCCESSFUL REMOVAL

```bash
cd apps/backend

# Stage changes
git add src/services/AlertService.ts

# Commit
git commit -m "chore: remove Phase 5 emergency alert suppression guard

- Migration 20241226_phase_5_admin_control applied successfully
- Alert acknowledgment logic now live
- Emergency guard no longer needed
- Refs: PHASE_5_PROGRESS.md"

# Push to production
git push origin main
```

---

**Status**: Ready to remove guard
**Action**: Tell me "remove the guard" and I'll execute the removal safely
