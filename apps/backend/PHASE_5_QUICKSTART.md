# PHASE 5 DEPLOYMENT - QUICK START

## 🎯 GOAL
Make Phase 5 permanent and remove the emergency alert suppression guard.

---

## ⚡ FAST TRACK (If Everything Goes Smoothly)

```bash
cd apps/backend

# 1. Verify DB connectivity (should succeed)
npx prisma db pull --force

# 2. Check migration status
npx prisma migrate status
# Shows: 20241226_phase_5_admin_control pending

# 3. Apply Phase 5 migration
npx prisma migrate deploy

# 4. Regenerate Prisma client
npx prisma generate

# 5. Rebuild and restart
npm run build && npm run start

# 6. Watch logs for 5 minutes
# Look for: NO "[ALERT_SUPPRESSED]" messages
# Means: Emergency guard is passing (schema exists)

# 7. Tell me "remove the guard"
# I'll safely remove the emergency code

# 8. Verify again
npx tsc --noEmit && npm run build && npm run start

# 9. Done! ✅
```

**Total time**: 10 minutes (if no issues)

---

## 🔍 DETAILED TRACK (If You Want to Verify Everything)

See: `PHASE_5_DEPLOYMENT_COMMANDS.md`

Includes:
- Full verification queries
- Schema validation checks
- Rollback procedures
- Test cases for alert acknowledgment

---

## 🚨 TROUBLESHOOTING

### Migration Fails

**Error**: `Migration failed to apply cleanly`

**Fix**:
```bash
# Check error details
npx prisma migrate status

# Common issues:
# - DB connection lost → Wait and retry
# - Migration already applied → Run: npx prisma migrate resolve --applied 20241226_phase_5_admin_control
# - Partial application → See PHASE_5_DEPLOYMENT_COMMANDS.md STEP 5 verification queries
```

### Backend Won't Start After Migration

**Symptoms**: Prisma client errors, TypeScript errors

**Fix**:
```bash
# Regenerate everything
rm -rf node_modules/.prisma
npx prisma generate
npm run build
npm run start
```

### Alerts Still Showing "[ALERT_SUPPRESSED]"

**Means**: Emergency guard is still suppressing (schema check failing)

**Debug**:
```sql
-- Run this query in your DB client:
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'alert_logs'
  AND column_name = 'acknowledged_at';

-- If returns 0 rows: Migration didn't apply
-- If returns 1 row: Migration applied, but Prisma client not regenerated
```

**Fix**:
```bash
npx prisma generate  # Regenerate client
npm run build        # Rebuild
npm run start        # Restart
```

---

## 📋 CHECKLIST

Before you start:
- [ ] .env file has DATABASE_URL set
- [ ] Database is accessible
- [ ] You have backup (if production)

After migration:
- [ ] Migration status shows "All migrations applied"
- [ ] Backend starts without errors
- [ ] NO `[ALERT_SUPPRESSED]` in logs
- [ ] TypeScript compiles clean

After guard removal:
- [ ] Emergency guard code deleted
- [ ] TypeScript still compiles
- [ ] Backend still works
- [ ] Alerts still work

---

## 📞 QUICK REFERENCE

| File | Purpose |
|------|---------|
| `PHASE_5_DEPLOYMENT_COMMANDS.md` | Full deployment guide with verification |
| `REMOVE_EMERGENCY_GUARD.md` | Guard removal instructions |
| `PHASE_5_QUICKSTART.md` | This file (quick overview) |
| `P3006_ERROR_RESOLUTION_COMPLETE.md` | Background on P3006 fix |

---

## ✅ SUCCESS CRITERIA

You're done when:
1. Migration applied ✅
2. Backend running ✅
3. No `[ALERT_SUPPRESSED]` messages ✅
4. Emergency guard removed ✅
5. TypeScript compiles ✅
6. Alerts work with acknowledgment logic ✅

---

**Ready?** Start with the Fast Track above, or see full guide in `PHASE_5_DEPLOYMENT_COMMANDS.md`
