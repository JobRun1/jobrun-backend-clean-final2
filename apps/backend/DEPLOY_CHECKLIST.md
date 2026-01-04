# JobRun Deployment Checklist

## Pre-Deploy (LOCAL)

- [ ] Run `npm run verify` - ALL checks must pass
- [ ] Review `git diff` - understand every change
- [ ] Test locally: `npm run dev` and call test endpoint
- [ ] Check logs show "✅ Routing verification passed"
- [ ] Check logs show "HIT NEW CODE — JOBRUN VOICE"
- [ ] Verify NO logs show "🚨 VOICE ROUTE HIT (via /api prefix)"

## Deploy to Railway

- [ ] Push to main branch
- [ ] Watch Railway build logs
- [ ] Wait for "Build successful" message
- [ ] Check deployment logs show routing verification

## Post-Deploy (PRODUCTION)

- [ ] Check logs for "✅ Routing verification passed"
- [ ] Check logs show NO "🚨 VOICE ROUTE HIT (via /api prefix)"
- [ ] Test production endpoint:
```bash
curl -X POST https://your-app.railway.app/api/twilio/voice \
  -d "To=+447414148956&From=+1234567890"
```
- [ ] Response should be TwiML (XML), not empty
- [ ] Make real test call to +447414148956
- [ ] Verify logs show "✅ PRODUCTION VOICE CALL"
- [ ] Verify logs show customer business name (FastFix Plumbing & Heating)
- [ ] Verify call completes normally
- [ ] Verify status webhook fires
- [ ] Verify customer SMS sent

## Rollback Plan

If production breaks:
```bash
git revert HEAD
git push origin main
```

Railway will auto-deploy the previous version.

## Success Criteria

✅ Customer calls +447414148956
✅ Hears voice message
✅ Call completes cleanly
✅ Logs show "HIT NEW CODE — JOBRUN VOICE"
✅ Logs show "REAL ROUTE, NOT ISOLATION"
✅ Logs show customer business name
✅ No isolation route logs
✅ Status callback fires
✅ Customer receives SMS

## Critical Files Changed

- `apps/backend/src/index.ts` - Deleted isolation route, changed mount path
- `apps/backend/src/routes/twilio.ts` - Enhanced logging
- `apps/backend/package.json` - Added test scripts
- `apps/backend/jest.config.js` - Test configuration (NEW)
- `apps/backend/src/tests/twilio-endpoints.test.ts` - Integration tests (NEW)
- `apps/backend/scripts/verify-deployment.sh` - Build verification (NEW)

## Emergency Contacts

If deployment fails, contact:
- Railway support
- Check logs at: https://railway.app/project/[your-project]/deployments

## Notes

This fix addresses the critical routing bug where:
- Isolation route at `/api/twilio/voice` was intercepting Twilio webhooks
- Route was mounted BEFORE body-parsing middleware
- Real routes were mounted at `/twilio/*` instead of `/api/twilio/*`

The fix:
- Deleted the isolation route entirely
- Changed mount path from `/twilio` to `/api/twilio`
- Added startup routing verification
- Added integration tests
- Added deployment verification script
