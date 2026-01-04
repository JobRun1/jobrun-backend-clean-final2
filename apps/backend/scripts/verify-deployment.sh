#!/bin/bash
set -e

echo "═══════════════════════════════════════════════════"
echo "JobRun Deployment Verification"
echo "═══════════════════════════════════════════════════"

# Check 1: Build succeeds
echo "✓ Checking build..."
npm run build

# Check 2: No isolation route in dist
echo "✓ Checking for isolation route in dist..."
if grep -q "VOICE ROUTE HIT (via /api prefix)" dist/index.js; then
  echo "❌ FAIL: Isolation route found in dist/index.js"
  exit 1
fi

# Check 3: Correct mount path in dist
echo "✓ Checking mount path in dist..."
if ! grep -q 'app.use("/api/twilio"' dist/index.js; then
  echo "❌ FAIL: Twilio router not mounted at /api/twilio"
  exit 1
fi

# Check 4: Routing verification exists in dist
echo "✓ Checking routing verification exists..."
if ! grep -q "Routing Verification" dist/index.js; then
  echo "❌ FAIL: Routing verification not found in dist"
  exit 1
fi

# Check 5: Real voice handler exists
echo "✓ Checking real voice handler exists..."
if ! grep -q "HIT NEW CODE — JOBRUN VOICE" dist/routes/twilio.js; then
  echo "❌ FAIL: Real voice handler not found"
  exit 1
fi

echo "═══════════════════════════════════════════════════"
echo "✅ ALL VERIFICATION CHECKS PASSED"
echo "═══════════════════════════════════════════════════"
echo ""
echo "Safe to deploy to production!"
echo ""
