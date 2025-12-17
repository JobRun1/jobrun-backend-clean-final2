# JobRun Backend

> AI-powered SMS automation for home service businesses

---

## 🚨 BOOTSTRAP INFRASTRUCTURE WARNING

**The following files are production-critical infrastructure.**
**Do NOT modify without incident review:**

- `prisma/migrations/*bootstrap*/migration.sql` — Creates default client on every deploy
- `src/index.ts` (lines 76-122) — `validateDefaultClient()` function
- `src/__tests__/bootstrap-survivability.test.ts` — Ensures fresh environments work

### Why This Matters

A past production incident was caused by implicit bootstrap assumptions:
- Railway does NOT run Prisma seed scripts
- Fresh environments need migration-based data creation
- Startup validation must crash if required data missing

### Protection Mechanisms

1. **Pre-commit hook** — Blocks deletion of bootstrap files
2. **CI test** — Runs migrations against empty DB on every PR
3. **CODEOWNERS** — Requires approval for bootstrap changes
4. **Branch protection** — Blocks merge if CI fails

### If You Need to Modify Bootstrap Logic

1. ❌ Do NOT delete existing migration
2. ✅ Create NEW migration with updated logic
3. ✅ Update `bootstrap-survivability.test.ts`
4. ✅ Verify CI passes before requesting review
5. ✅ Get approval from platform team

**Incident details:** `docs/INCIDENT-BOOTSTRAP.md`

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Twilio account (for SMS)
- OpenAI API key (for AI pipeline)

### Local Development

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your credentials

# Run migrations (creates tables + bootstrap data)
npx prisma migrate dev

# Start development server
npm run dev
```

**Note:** You do NOT need to run `npm run seed` manually. The bootstrap migration creates the default client automatically.

---

## 📦 Project Structure

```
apps/backend/
├── prisma/
│   ├── schema.prisma              # Database schema
│   ├── migrations/                # Migration files
│   │   └── *bootstrap*/           # ⚠️ PROTECTED: Bootstrap migration
│   └── seed.ts                    # Development seed data (local only)
├── src/
│   ├── index.ts                   # ⚠️ PROTECTED: Startup + validation
│   ├── routes/                    # API routes
│   │   ├── twilio.ts              # Twilio webhook handler
│   │   ├── admin.ts               # Admin dashboard API
│   │   └── ...
│   ├── agents/                    # AI agent logic
│   ├── modules/                   # Business logic
│   └── __tests__/
│       └── bootstrap-survivability.test.ts  # ⚠️ PROTECTED: CI test
└── package.json
```

---

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run Bootstrap Survivability Test

```bash
npm test -- bootstrap-survivability.test.ts
```

This test:
- Spins up empty PostgreSQL database
- Runs `prisma migrate deploy`
- Verifies default client + settings created
- Validates startup code exists
- **Fails loudly if bootstrap broken**

**This test runs on every PR and blocks merge if it fails.**

---

## 🚢 Deployment

### Railway Production

Railway automatically runs on every push to `main`:

```bash
# Railway build process:
1. npm install
2. npx prisma generate
3. npx prisma migrate deploy  # ← Creates bootstrap data automatically
4. npm run build
5. npm start
```

**Important:** Railway does NOT run `npm run seed`. Bootstrap data comes from migration.

### Environment Variables

Required in Railway:

```
DATABASE_URL               # Auto-provided by Railway
DEFAULT_CLIENT_ID          # Must be: default-client
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_NUMBER
OPENAI_API_KEY
```

### Health Check

Railway monitors: `/api/health`

Returns 200 if:
- Default client exists
- Client settings exist
- `metadata.bookingUrl` is valid

Returns 503 if bootstrap invariants violated.

---

## 📚 API Documentation

### Twilio Webhook

**Endpoint:** `POST /twilio/webhook`

**Purpose:** Receives inbound SMS, triggers AI pipeline

**Flow:**
1. Customer sends SMS to Twilio number
2. Twilio forwards to `/twilio/webhook`
3. AI pipeline qualifies lead
4. Response sent via Twilio API
5. Customer + messages persisted to database

**Logs:**
```
🤖 INBOUND SMS AI PIPELINE START
✅ Customer created: +15555551234
✅ AI response sent
✅ INBOUND SMS PIPELINE COMPLETE
```

### Admin Dashboard API

**Endpoint:** `GET /api/admin/*`

See `src/routes/admin.ts` for full API.

---

## 🔒 Security

- All routes require authentication (except Twilio webhook)
- Twilio webhook validates signature
- Environment variables never committed
- Database credentials managed by Railway

---

## 📖 Additional Documentation

- **Incident Postmortem:** `docs/INCIDENT-BOOTSTRAP.md`
- **Deployment Checklist:** `DEPLOYMENT-CHECKLIST.md`
- **Architecture Overview:** `ARCHITECTURE.md`
- **Environment Variables:** `ENV_VARS.md`

---

## 🛠️ Common Tasks

### Add New Migration

```bash
npx prisma migrate dev --name descriptive_name
```

### Reset Local Database

```bash
npx prisma migrate reset
# This reruns ALL migrations (including bootstrap)
```

### Access Production Database

```bash
railway run psql $DATABASE_URL
```

### View Production Logs

```bash
railway logs --environment production
```

---

## ⚠️ Common Mistakes to Avoid

❌ **Do NOT** delete bootstrap migration
❌ **Do NOT** remove `validateDefaultClient()` function
❌ **Do NOT** bypass CI tests with `--no-verify`
❌ **Do NOT** run manual seed scripts against production
❌ **Do NOT** assume Prisma seed runs in Railway

✅ **DO** let migrations create bootstrap data
✅ **DO** verify CI passes before merging
✅ **DO** check health endpoint after deploy
✅ **DO** read incident postmortem before changing bootstrap logic

---

## 🆘 Help

**Production is down?**
1. Check Railway logs: `railway logs`
2. Check health endpoint: `curl https://your-app.railway.app/api/health`
3. Verify bootstrap data: `railway run psql -c "SELECT id FROM clients WHERE id='default-client'"`

**Fresh environment won't start?**
1. Verify migrations ran: Check Railway build logs for "Applying migration"
2. Run bootstrap test locally: `npm test -- bootstrap-survivability.test.ts`
3. Check if migration file exists: `ls prisma/migrations/*bootstrap*`

**Need help?**
- Read: `docs/INCIDENT-BOOTSTRAP.md`
- Contact: Platform team (@OWNER_GITHUB_USERNAME)
