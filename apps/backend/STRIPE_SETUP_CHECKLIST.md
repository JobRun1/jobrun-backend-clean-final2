# STRIPE CONFIGURATION CHECKLIST

This checklist ensures Stripe is correctly configured for JobRun payment processing.

## ✅ REQUIRED ENVIRONMENT VARIABLES

Add these to your `.env` file:

```bash
# Stripe Secret Key (from Stripe Dashboard → Developers → API keys)
STRIPE_SECRET_KEY=sk_test_...   # Test mode
# STRIPE_SECRET_KEY=sk_live_...  # Production mode

# Stripe Webhook Secret (from Stripe Dashboard → Developers → Webhooks)
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Checkout URL (payment link for customers)
STRIPE_CHECKOUT_URL=https://buy.stripe.com/test_...  # Test mode
# STRIPE_CHECKOUT_URL=https://buy.stripe.com/...    # Production mode
```

---

## 🔧 STRIPE DASHBOARD SETUP

### 1. Create Stripe Account
- [ ] Sign up at https://dashboard.stripe.com
- [ ] Complete business verification (required for live mode)

### 2. Create Product (£49/month, 7-day trial)
- [ ] Navigate to: Products → Add product
- [ ] Name: "JobRun Subscription"
- [ ] Pricing: £49.00 GBP / month
- [ ] Billing period: Monthly
- [ ] Free trial: 7 days
- [ ] Click "Save product"

### 3. Create Payment Link
- [ ] Navigate to: Payment links → New
- [ ] Select product: "JobRun Subscription"
- [ ] Collection method: "Subscription"
- [ ] Payment method: Card
- [ ] **CRITICAL**: Under "Advanced settings" → "Metadata"
  - Add field: `phone_number` = `{{PHONE_NUMBER}}`
  - This is REQUIRED for webhook to activate correct client
- [ ] Click "Create link"
- [ ] Copy link URL → Add to .env as `STRIPE_CHECKOUT_URL`

### 4. Configure Webhook
- [ ] Navigate to: Developers → Webhooks → Add endpoint
- [ ] Endpoint URL: `https://your-domain.com/api/webhooks/stripe`
  - For local testing: Use Stripe CLI (see below)
- [ ] Events to send: Select "checkout.session.completed"
- [ ] Click "Add endpoint"
- [ ] Copy "Signing secret" (whsec_...) → Add to .env as `STRIPE_WEBHOOK_SECRET`

---

## 🧪 LOCAL TESTING WITH STRIPE CLI

### Install Stripe CLI
```bash
# macOS (Homebrew)
brew install stripe/stripe-cli/stripe

# Windows (Scoop)
scoop install stripe

# Or download from: https://stripe.com/docs/stripe-cli
```

### Authenticate
```bash
stripe login
```

### Forward webhooks to local server
```bash
# Terminal 1: Start JobRun backend
cd apps/backend
npm run dev

# Terminal 2: Forward Stripe webhooks to localhost
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

The CLI will output a webhook signing secret (whsec_...). Add this to your `.env` file.

### Test Payment Flow
```bash
# Trigger a test checkout.session.completed event
stripe trigger checkout.session.completed
```

---

## 🔍 VERIFICATION CHECKLIST

### Startup Verification
- [ ] Backend starts without Stripe configuration errors
- [ ] Console shows: "✅ [Stripe] Ops alerting configured correctly"
- [ ] No errors about missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET

### Webhook Verification
- [ ] Send test webhook from Stripe Dashboard
- [ ] Backend logs: "[Stripe] Webhook received: checkout.session.completed"
- [ ] Backend logs: "✅ [Stripe] CLIENT ACTIVATED SUCCESSFULLY"
- [ ] Client record updated: paymentActive=true, billingStatus='trial'
- [ ] Trial dates set correctly (7 days from activation)

### Idempotency Verification
- [ ] Send same webhook twice
- [ ] First attempt: Client activated
- [ ] Second attempt: Logs "Client already activated (paymentActive=true)"
- [ ] Database NOT updated twice (idempotent)

### Error Handling Verification
- [ ] Send webhook with invalid signature → Returns 400
- [ ] Send webhook without phone_number metadata → Logs error, does not crash
- [ ] Send webhook for non-existent client → Logs error, does not crash

---

## 🚨 COMMON ISSUES

### Issue: Webhook signature verification fails
**Cause:** Wrong STRIPE_WEBHOOK_SECRET
**Fix:**
1. Go to Stripe Dashboard → Webhooks
2. Click on your endpoint
3. Copy "Signing secret" (whsec_...)
4. Update .env with correct value
5. Restart backend

### Issue: Client not activated after payment
**Cause:** phone_number not in session metadata
**Fix:**
1. Check Stripe payment link metadata includes `phone_number`
2. When creating checkout session programmatically:
   ```javascript
   const session = await stripe.checkout.sessions.create({
     // ... other params
     metadata: {
       phone_number: client.phoneNumber, // REQUIRED
     },
   });
   ```

### Issue: Client phone number mismatch
**Cause:** Phone number normalization mismatch
**Fix:**
1. Ensure phone numbers stored in E.164 format (+447...)
2. Use phoneUtils.validateAndNormalizePhone() for all phone inputs
3. Check client.phoneNumber matches session.metadata.phone_number exactly

---

## 📋 PRODUCTION DEPLOYMENT CHECKLIST

Before going live:

- [ ] Switch to live mode keys (sk_live_..., not sk_test_...)
- [ ] Update STRIPE_CHECKOUT_URL to live payment link
- [ ] Update webhook endpoint to production URL
- [ ] Test live payment with real card (can refund immediately)
- [ ] Verify webhook delivery in production
- [ ] Monitor Stripe Dashboard for first 48 hours
- [ ] Set up Stripe email notifications for failed payments

---

## 🔗 USEFUL LINKS

- Stripe Dashboard: https://dashboard.stripe.com
- API Keys: https://dashboard.stripe.com/apikeys
- Webhooks: https://dashboard.stripe.com/webhooks
- Payment Links: https://dashboard.stripe.com/payment-links
- Stripe CLI Docs: https://stripe.com/docs/stripe-cli
- Testing Cards: https://stripe.com/docs/testing

---

## ⚡ QUICK START (TEST MODE)

1. Add to `.env`:
   ```bash
   STRIPE_SECRET_KEY=sk_test_51...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_CHECKOUT_URL=https://buy.stripe.com/test_...
   ```

2. Start backend:
   ```bash
   npm run dev
   ```

3. In another terminal, start Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:3001/api/webhooks/stripe
   ```

4. Trigger test payment:
   ```bash
   stripe trigger checkout.session.completed
   ```

5. Check backend logs for: "✅ [Stripe] CLIENT ACTIVATED SUCCESSFULLY"

---

**Last Updated:** 2025-12-24
**Status:** PRODUCTION-READY ✅
