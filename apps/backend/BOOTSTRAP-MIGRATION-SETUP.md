# Bootstrap Migration Setup

This guide walks through applying the bootstrap migration to your local database.

---

## ✅ Migration File Created

**Location:** `prisma/migrations/20251214120000_bootstrap_default_client/migration.sql`

**What it does:**
1. Creates `default-client` row in `clients` table (UK-based)
2. Creates `client_settings` row with metadata (including `bookingUrl`)
3. Creates database trigger to prevent deletion
4. Verifies all data created successfully

**Features:**
- ✅ Idempotent (safe to run multiple times)
- ✅ UK region, Europe/London timezone
- ✅ Self-verifying (raises error if creation fails)
- ✅ Deletion-protected (trigger blocks `DELETE`)

---

## 🚀 Apply Migration Locally

### Step 1: Ensure Database is Running

```bash
# If using Docker:
docker ps | grep postgres

# If using local PostgreSQL:
psql --version
```

### Step 2: Apply Migration

```bash
cd apps/backend

# Apply the migration
npx prisma migrate dev --name bootstrap_default_client
```

**What happens:**
- Prisma reads the migration file
- Applies SQL to your database
- Records migration in `_prisma_migrations` table
- Generates Prisma Client

**Expected output:**
```
Applying migration `20251214120000_bootstrap_default_client`
NOTICE:  ✅ Bootstrap default client created and verified

The following migration(s) have been applied:

migrations/
  └─ 20251214120000_bootstrap_default_client/
    └─ migration.sql

✔ Generated Prisma Client
```

**If you see the ✅ notice:** Migration succeeded!

---

## 🧪 Verify Bootstrap Data

### Option 1: Using Prisma Studio

```bash
npx prisma studio
```

1. Open browser to `http://localhost:5555`
2. Click `clients` table
3. Verify row exists:
   - `id`: `default-client`
   - `businessName`: `JobRun UK`
   - `region`: `UK`
   - `timezone`: `Europe/London`
4. Click `client_settings` table
5. Verify row exists:
   - `clientId`: `default-client`
   - `metadata.bookingUrl`: `https://calendly.com/jobrun-uk`

### Option 2: Using SQL Script

```bash
# Run verification script
psql $DATABASE_URL -f verify-bootstrap.sql
```

**Expected output:**
```
✅ Client exists       | default-client | JobRun UK | UK | Europe/London
✅ Settings exist      | default-client | JobRun UK | contact@jobrun.uk
✅ Booking URL valid   | https://calendly.com/jobrun-uk
✅ Trigger exists      | protect_bootstrap_client | BEFORE DELETE
ERROR: Cannot delete bootstrap client (required for JobRun startup)
```

**Note:** The ERROR in test 5 is expected and proves deletion protection works.

### Option 3: Using psql Directly

```bash
psql $DATABASE_URL -c "
SELECT
  c.id,
  c.\"businessName\",
  c.region,
  c.timezone,
  cs.metadata->>'bookingUrl' AS booking_url
FROM clients c
JOIN client_settings cs ON cs.\"clientId\" = c.id
WHERE c.id = 'default-client';
"
```

**Expected output:**
```
id             | businessName | region | timezone       | booking_url
default-client | JobRun UK    | UK     | Europe/London  | https://calendly.com/jobrun-uk
```

---

## 🔒 Test Deletion Protection

### Test: Try to Delete Default Client

```bash
psql $DATABASE_URL -c "DELETE FROM clients WHERE id = 'default-client';"
```

**Expected result:**
```
ERROR:  Cannot delete bootstrap client (required for JobRun startup)
CONTEXT:  PL/pgSQL function prevent_bootstrap_deletion() line 4 at RAISE
```

**If you see this error:** ✅ Deletion protection is working correctly!

**If deletion succeeds:** ❌ Trigger not created, migration failed

---

## ✅ Bootstrap Migration Checklist

After running migration, verify:

- [ ] Migration applied successfully (no errors)
- [ ] Prisma Studio shows `default-client` in clients table
- [ ] Prisma Studio shows client_settings row with `clientId='default-client'`
- [ ] `metadata.bookingUrl` exists and is valid URL
- [ ] Region is `UK`, timezone is `Europe/London`
- [ ] Deletion attempt throws error (protection works)
- [ ] `verify-bootstrap.sql` script shows all ✅ checks

**When all checked:** ✅ **Bootstrap migration is ready**

---

## 🚢 Next Steps

### 1. Test Startup Validation

Ensure the app starts successfully with bootstrap data:

```bash
npm run dev
```

**Expected logs:**
```
✅ All required environment variables present
✅ Default client validated:
   ID: default-client
   Business: JobRun UK
   Booking URL: https://calendly.com/jobrun-uk
✅ Backend listening on 0.0.0.0:3001
```

### 2. Commit Migration

```bash
git add prisma/migrations/20251214120000_bootstrap_default_client/
git commit -m "feat: add bootstrap migration for UK default client"
git push origin main
```

### 3. Deploy to Railway

When pushed to main, Railway will automatically:
1. Run `npx prisma migrate deploy`
2. Apply bootstrap migration
3. Create default client in production database
4. Start app successfully

**No manual seed required!**

---

## 🔧 Customization (Optional)

### Update Phone Number

Edit migration SQL before applying:

```sql
'phoneNumber', '+447700900000',    -- Replace with your Twilio number
'twilioNumber', '+447700900000',   -- Same number
'urgent_alert_number', '+447700900000',  -- In metadata section
```

### Update Booking URL

Edit migration SQL before applying:

```sql
'bookingUrl', 'https://calendly.com/jobrun-uk',  -- Replace with your URL
```

### Update Business Details

Edit migration SQL:

```sql
'businessName', 'JobRun UK',           -- Your business name
'serviceArea', 'Greater London',       -- Your service area
email, 'contact@jobrun.uk',           -- Your email
```

**After editing:** Re-run `npx prisma migrate dev`

---

## ⚠️ Common Issues

### Error: "relation does not exist"

**Cause:** Tables not created yet

**Fix:**
```bash
# Run all migrations first
npx prisma migrate deploy

# Then apply bootstrap
npx prisma migrate dev --name bootstrap_default_client
```

### Error: "duplicate key value violates unique constraint"

**Cause:** Default client already exists

**Fix:** Migration is idempotent, this is OK. The `ON CONFLICT DO UPDATE` handles it.

### Error: "trigger already exists"

**Cause:** Trigger from previous migration

**Fix:** Migration drops and recreates trigger, this is OK.

### No error but data missing

**Check migration was applied:**
```bash
psql $DATABASE_URL -c "
SELECT migration_name, finished_at
FROM _prisma_migrations
WHERE migration_name LIKE '%bootstrap%'
ORDER BY finished_at DESC;
"
```

**If migration is listed but data missing:**
- Check migration SQL file has INSERT statements (not just verification)
- Re-run migration: `npx prisma migrate deploy`

---

## 🆘 Emergency Recovery

### If you need to reset and start over:

```bash
# WARNING: This deletes all data
npx prisma migrate reset

# Re-applies all migrations including bootstrap
# You'll be prompted to confirm
```

### If production database is missing bootstrap data:

```bash
# Connect to production database
railway run psql $DATABASE_URL

# Manually run migration SQL
\i prisma/migrations/20251214120000_bootstrap_default_client/migration.sql

# Exit
\q
```

---

## 📊 Migration Status

```
✅ Migration file created
⏳ Migration applied locally (run npx prisma migrate dev)
⏳ Data verified (run verify-bootstrap.sql)
⏳ Deletion protection tested
⏳ Migration committed to git
⏸️  Migration deployed to Railway (push to main)
```

---

**Ready?** Run `npx prisma migrate dev --name bootstrap_default_client` now.
