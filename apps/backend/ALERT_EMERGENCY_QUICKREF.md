# ALERT SPAM EMERGENCY - QUICK REFERENCE

## ✅ IMMEDIATE ACTION (COMPLETED)

**Emergency guard deployed** in `apps/backend/src/services/AlertService.ts`

```typescript
// Line 135-154: Guard checks Phase 5 schema before sending alerts
// Line 316-356: Schema check method (fail-closed)
```

---

## 🚀 DEPLOY NOW

```bash
cd apps/backend

# 1. Verify TypeScript compiles
npx tsc --noEmit
# ✅ Should show: no output (success)

# 2. Build
npm run build

# 3. Deploy to production
# (Use your deployment method: git push, Railway CLI, etc.)

# 4. Restart backend
npm run start
```

---

## 🔍 VERIFY SUPPRESSION

**Watch logs for**:
```
[ALERT_SUPPRESSED] Phase 5 schema not deployed — all ops alerts paused until migration applied
```

**Confirm**:
- NO Twilio SMS being sent
- NO `[ALERT] SMS sent successfully` messages
- Founder phone receives NO alerts

---

## 🔧 PERMANENT FIX (When Ready)

```bash
cd apps/backend

# Step 1: Check migration status
npx prisma migrate status

# Step 2: Apply Phase 5 migration
npx prisma migrate deploy

# Step 3: Regenerate client
npx prisma generate

# Step 4: Restart backend
npm run build && npm run start
```

**Verify alerts resume**:
- NO more `[ALERT_SUPPRESSED]` messages
- Alerts flow through normal deduplication
- Alert acknowledgment works

---

## 🧹 CLEANUP (After 24h)

**Remove emergency guard** from `AlertService.ts`:

1. Delete lines 135-154 (guard in sendCriticalAlert)
2. Delete lines 316-356 (checkPhase5SchemaExists method)
3. Verify: `npx tsc --noEmit`
4. Commit: `git commit -m "chore: remove Phase 5 emergency guard"`

---

## 🚨 IF GUARD FAILS

**Logs show alert spam continuing?**

1. Check deployment succeeded:
   ```bash
   git log -1  # Verify commit deployed
   ```

2. Check TypeScript compilation:
   ```bash
   npx tsc --noEmit
   ```

3. Force restart backend

4. **Nuclear option** (last resort):
   ```bash
   # Add to .env
   ALERTS_DISABLED=true
   ```

---

## 📞 EXPECTED BEHAVIOR

### BEFORE Phase 5 Migration
- ✅ Guard suppresses ALL alerts
- ✅ Log: `[ALERT_SUPPRESSED]`
- ✅ NO SMS sent
- ✅ Founder phone quiet

### AFTER Phase 5 Migration
- ✅ Guard passes (schema exists)
- ✅ Alerts use acknowledgment logic
- ✅ 24h cooldown after acknowledgment
- ✅ No more spam

### EDGE CASES
- DB unreachable? → Guard suppresses (fail-closed)
- Schema check errors? → Guard suppresses (fail-closed)
- Multiple instances? → Each checks independently

---

**STATUS**: ✅ Code ready to deploy
**ACTION**: Deploy → Verify → Migrate → Cleanup
