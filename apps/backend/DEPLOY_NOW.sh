#!/bin/bash
# EMERGENCY ALERT GUARD DEPLOYMENT
# Run this script to deploy the guarded code

set -e  # Exit on any error

cd "$(dirname "$0")"

echo "═══════════════════════════════════════════"
echo "🚨 EMERGENCY ALERT GUARD DEPLOYMENT"
echo "═══════════════════════════════════════════"
echo ""

# Step 1: Build
echo "📦 Building application..."
npm run build
echo "✅ Build complete"
echo ""

# Step 2: Deploy (choose your method)
echo "🚀 Ready to deploy"
echo ""
echo "Choose your deployment method:"
echo ""
echo "Option A - Railway:"
echo "  git add ."
echo "  git commit -m 'emergency: deploy Phase 5 alert suppression guard'"
echo "  git push origin main"
echo ""
echo "Option B - PM2:"
echo "  pm2 restart jobrun-backend"
echo ""
echo "Option C - Direct:"
echo "  npm run start"
echo ""
echo "═══════════════════════════════════════════"
