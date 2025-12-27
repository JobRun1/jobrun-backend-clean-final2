# STRIPE WEBHOOK ENABLING GUIDE

**Phase**: TIER 3 PHASE 4
**Status**: Implementation complete, routes disabled
**Action Required**: Enable routes in production

---

## 🎯 CURRENT STATUS

✅ **Implementation Complete**
- Stripe webhook handler rewritten to use billing law
- Idempotency via BillingEvent table enforced
- All transitions use `transitionBillingState()`
- Comprehensive logging and error handling

⚠️ **Routes Currently Disabled**
- Stripe routes are commented out in `src/index.ts`
- Need to be manually enabled before going live

---

## 📋 ENABLING CHECKLIST

### 1. Enable Stripe Routes in index.ts

**File**: `apps/backend/src/index.ts`

**Current state** (lines 56, 140-141):
```typescript
// import stripeRoutes from "./routes/stripe";

// CRITICAL: Stripe webhook needs raw body BEFORE json middleware
// app.use("/api/webhooks", stripeRoutes);
```

**Required change**:
```typescript
import stripeRoutes from "./routes/stripe";

// CRITICAL: Stripe webhook needs raw body BEFORE json middleware
app.use("/api/webhooks", stripeRoutes);
```

**⚠️ IMPORTANT**: This line must come **BEFORE** `app.use(express.json())` because Stripe signature verification requires the raw request body.

---

### 2. Configure Environment Variables

**File**: `apps/backend/.env`

Add the following:

```bash
# Stripe Configuration (REQUIRED for payment processing)
STRIPE_SECRET_KEY=sk_test_...           # Test mode: sk_test_... | Live mode: sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...         # From Stripe Dashboard → Webhooks
STRIPE_CHECKOUT_URL=https://buy.stripe.com/test_...  # Optional: Checkout page URL
```

**How to get these values**:

1. **STRIPE_SECRET_KEY**:
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
   - Copy "Secret key" (for test mode: `sk_test_...`)

2. **STRIPE_WEBHOOK_SECRET**:
   - Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
   - Click "Add endpoint"
   - Endpoint URL: `https://your-domain.com/api/webhooks/stripe`
   - Select events: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`
   - Click "Add endpoint"
   - Copy "Signing secret" (`whsec_...`)

---

### 3. Stripe Dashboard Configuration

#### Create Webhook Endpoint

1. **Navigate**: [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. **Click**: "Add endpoint"
3. **Endpoint URL**: `https://your-domain.com/api/webhooks/stripe`
4. **Description**: "JobRun Billing Webhooks"
5. **Events to send**:
   - ✅ `checkout.session.completed`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
   - ✅ `customer.subscription.deleted`
6. **API version**: Use latest (or match your Stripe SDK version)
7. **Click**: "Add endpoint"
8. **Copy**: Signing secret → Add to `.env` as `STRIPE_WEBHOOK_SECRET`

#### Update Checkout Session Creation

When creating Stripe checkout sessions, ensure `client_id` is included in metadata:

```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{
    price: 'price_abc123', // Your price ID
    quantity: 1,
  }],
  success_url: 'https://your-domain.com/success',
  cancel_url: 'https://your-domain.com/cancel',
  metadata: {
    client_id: client.id, // CRITICAL: Required for webhook processing
  },
});
```

---

### 4. Database Migration Check

Ensure `BillingEvent` table exists:

```sql
-- Check if table exists
SELECT * FROM billing_events LIMIT 1;
```

If table doesn't exist, run migrations:

```bash
npx prisma migrate deploy
npx prisma generate
```

---

### 5. Testing Before Production

#### A. Test with Stripe CLI

Install Stripe CLI:
```bash
brew install stripe/stripe-cli/stripe
# or download from https://stripe.com/docs/stripe-cli
```

Forward webhooks to localhost:
```bash
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
```

Trigger test events:
```bash
# Test checkout completion
stripe trigger checkout.session.completed

# Test payment success
stripe trigger invoice.payment_succeeded

# Test payment failure
stripe trigger invoice.payment_failed

# Test subscription cancellation
stripe trigger customer.subscription.deleted
```

#### B. Monitor Logs

Watch for the following log patterns:

**Success**:
```
[Stripe] Processing event: checkout.session.completed
[Stripe] Resolved client ID: clABC123
[Stripe] ✅ Transition allowed: TRIAL_ACTIVE → ACTIVE
[Stripe] ✅ Subscription activated: TRIAL_ACTIVE → ACTIVE
[Stripe] ✅ Event processed successfully in 245ms
```

**Idempotency (expected)**:
```
[Stripe] ⏭️  Event evt_abc123 already processed (idempotent NO-OP)
```

**Invalid state (expected)**:
```
[Stripe] ⏭️  Event invoice.payment_failed received in invalid state: TRIAL_ACTIVE
[Stripe] This is SAFE - event ignored, state unchanged
```

#### C. Verify Database

Check BillingEvent table:
```sql
SELECT * FROM billing_events ORDER BY created_at DESC LIMIT 10;
```

Check ClientBilling transitions:
```sql
SELECT
  cb.client_id,
  cb.status,
  cb.last_billing_event_type,
  cb.last_billing_event_at,
  cb.stripe_customer_id,
  cb.stripe_subscription_id
FROM client_billing cb
ORDER BY cb.updated_at DESC
LIMIT 10;
```

---

### 6. Production Deployment

#### Step 1: Deploy to Staging

1. Deploy code to staging environment
2. Configure staging Stripe test mode credentials
3. Create test checkout session
4. Complete test payment
5. Verify billing state transitions correctly
6. Trigger duplicate webhook (via Stripe Dashboard)
7. Verify idempotency works

#### Step 2: Monitor Staging for 48 Hours

Watch for:
- ✅ All webhook events processed successfully
- ✅ No duplicate state transitions
- ✅ Invalid events ignored safely
- ✅ BillingEvent table growing linearly with events

#### Step 3: Deploy to Production

1. Switch to Stripe live mode credentials
2. Update webhook endpoint URL in Stripe Dashboard
3. Deploy code
4. Test with real payment (small amount)
5. Monitor for 24 hours before announcing

---

## 🚨 ROLLBACK PLAN

If issues arise in production:

### Immediate Rollback (< 5 minutes)

1. **Disable webhook processing**:
   ```typescript
   // src/index.ts
   // app.use("/api/webhooks", stripeRoutes); // DISABLED
   ```

2. **Deploy immediately**

3. **Stripe will queue events** for up to 72 hours

4. **Fix issue** in development

5. **Re-enable** when ready

### Stripe Event Replay

If webhooks were disabled during critical period:

1. Go to Stripe Dashboard → Webhooks → [Your endpoint]
2. Click on failed/missed events
3. Click "Resend" for each event
4. System will process idempotently (safe to replay)

---

## 🔍 POST-DEPLOYMENT MONITORING

### Critical Metrics

Monitor these for the first 7 days:

1. **Webhook Success Rate**
   ```sql
   SELECT
     COUNT(*) as total_events,
     COUNT(DISTINCT client_id) as unique_clients,
     AVG(processing_time_ms) as avg_processing_time
   FROM billing_events
   WHERE created_at > NOW() - INTERVAL '24 hours';
   ```

2. **Billing State Distribution**
   ```sql
   SELECT
     status,
     COUNT(*) as client_count
   FROM client_billing
   GROUP BY status
   ORDER BY client_count DESC;
   ```

3. **Failed Transitions** (check logs for these)
   ```bash
   grep "❌ Failed to" /var/log/app.log
   ```

4. **Duplicate Events**
   ```sql
   SELECT
     stripe_event_id,
     COUNT(*) as delivery_count
   FROM billing_events
   GROUP BY stripe_event_id
   HAVING COUNT(*) > 1;
   ```

### Alerts to Set Up

1. **Webhook failures** (via Stripe Dashboard)
   - Email when webhook endpoint returns non-200
   - Email when 5+ consecutive failures

2. **State transition failures** (via application logs)
   - Alert when "Failed to activate subscription" appears
   - Alert when "No billing record for client" appears

3. **Idempotency anomalies**
   - Alert when same event processed >3 times
   - Alert when BillingEvent growth rate spikes

---

## ✅ FINAL CHECKLIST

Before enabling in production:

- [ ] Stripe routes uncommented in `src/index.ts`
- [ ] `STRIPE_SECRET_KEY` set in `.env` (live mode)
- [ ] `STRIPE_WEBHOOK_SECRET` set in `.env`
- [ ] Webhook endpoint created in Stripe Dashboard
- [ ] Webhook events selected: `checkout.session.completed`, `invoice.payment_*`, `customer.subscription.deleted`
- [ ] Checkout session metadata includes `client_id`
- [ ] Database migrations applied
- [ ] Tested in staging for 48 hours
- [ ] Monitoring dashboards configured
- [ ] Rollback plan documented
- [ ] Team notified of deployment

---

## 🆘 TROUBLESHOOTING

### Problem: "STRIPE_SECRET_KEY not configured"

**Cause**: Environment variable not set
**Fix**: Add to `.env` and restart server

### Problem: "Webhook signature verification FAILED"

**Cause**: Wrong `STRIPE_WEBHOOK_SECRET` or malicious request
**Fix**:
1. Verify secret matches Stripe Dashboard
2. Check raw body middleware order in `index.ts`

### Problem: "Could not resolve client ID from event"

**Cause**: Checkout session missing `client_id` in metadata
**Fix**: Update checkout session creation code to include metadata

### Problem: "No billing record for client"

**Cause**: Client created without `ClientBilling` record
**Fix**: Ensure client creation also creates `ClientBilling` record

### Problem: Duplicate state transitions

**Cause**: Idempotency not working (BillingEvent record failed)
**Fix**: Check database constraints, ensure unique index on `stripeEventId`

---

## 📚 RELATED DOCUMENTATION

- [TIER_3_PHASE_4_COMPLETE.md](./TIER_3_PHASE_4_COMPLETE.md) - Implementation details
- [billingTransitions.ts](./src/utils/billingTransitions.ts) - State machine logic
- [stripe.ts](./src/routes/stripe.ts) - Webhook handler
- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)

---

**Ready to enable?** Follow the checklist above and deploy with confidence.
