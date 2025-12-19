#!/bin/bash

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  ONBOARDING-ONLY DEPLOYMENT SCRIPT
#  Twilio Number: 07476955179
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

set -e  # Exit on error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 ONBOARDING-ONLY DEPLOYMENT SCRIPT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 1: PRISMA MIGRATION & CODE GENERATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "📦 Step 1: Running Prisma migrations..."
cd apps/backend

echo "   > prisma migrate deploy"
npx prisma migrate deploy

echo "   > prisma generate"
npx prisma generate

echo "✅ Prisma migration complete"
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 2: INSTALL DEPENDENCIES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "📦 Step 2: Installing dependencies..."
npm install

echo "✅ Dependencies installed"
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 3: BUILD TYPESCRIPT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "🔨 Step 3: Building TypeScript..."
npm run build

echo "✅ Build complete"
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 4: VERIFY COMPILED FILES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "🔍 Step 4: Verifying compiled files..."

if [ -f "dist/services/OnboardingService.js" ]; then
  echo "✅ OnboardingService.js exists"
else
  echo "❌ ERROR: OnboardingService.js not found"
  exit 1
fi

if [ -f "dist/routes/twilio.js" ]; then
  echo "✅ twilio.js exists"
else
  echo "❌ ERROR: twilio.js not found"
  exit 1
fi

echo "✅ All compiled files present"
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 5: GIT COMMIT & PUSH
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "📝 Step 5: Committing changes..."

cd ../..  # Back to root

git add .

git commit -m "$(cat <<'EOF'
feat: implement onboarding-only mode for 07476955179

IMPLEMENTATION:
- Add OnboardingState database model with state machine
- Implement OnboardingService with Claude extraction (temp=0)
- Add hard gate in Twilio SMS handler at line 110
- Bypass Sentinel/Dial/Flow/Lyra for onboarding number

SAFETY:
- Number-based routing BEFORE any AI logic
- Reply whitelist enforcement (hard replacement)
- Server-side field normalization
- Two-tier idempotency (database-based, Redis-ready)

FILES CREATED:
- apps/backend/src/services/OnboardingService.ts
- apps/backend/prisma/migrations/20241218_add_onboarding_state/

FILES MODIFIED:
- apps/backend/prisma/schema.prisma
- apps/backend/src/routes/twilio.ts

VERIFICATION:
See ONBOARDING-ONLY-IMPLEMENTATION.md for complete test plan

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"

echo "✅ Changes committed"
echo ""

echo "🚀 Step 6: Pushing to Railway..."
git push origin main

echo "✅ Push complete"
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DEPLOYMENT COMPLETE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOYMENT COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1. Monitor Railway deployment logs for:"
echo "   ✅ Prisma migration applied"
echo "   ✅ Build completed successfully"
echo "   ✅ Backend listening on 0.0.0.0:3001"
echo ""
echo "2. Verify hard gate is active:"
echo "   - Send test SMS to 07476955179"
echo "   - Check logs for: 🔒 [HARD GATE] ONBOARDING-ONLY NUMBER DETECTED"
echo "   - Confirm NO Sentinel/Dial/Flow/Lyra logs appear"
echo ""
echo "3. Run end-to-end onboarding test:"
echo "   - Make test call to 07476955179"
echo "   - Complete full onboarding flow (S1 → S5 → COMPLETE)"
echo "   - Verify all canonical replies are sent"
echo ""
echo "4. Check database state:"
echo "   SELECT * FROM onboarding_states WHERE customer_id = '<customer_id>';"
echo ""
echo "📖 Full verification checklist: ONBOARDING-ONLY-IMPLEMENTATION.md"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
