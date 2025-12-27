# TIER 2: COMMERCIAL TRUTH & CONTROL LAYER

**Status:** Design Phase
**Tier 1 Completion:** ✅ Confirmed - System boots cleanly
**Date:** 2025-12-26

---

## 📋 EXECUTIVE SUMMARY

Tier 2 introduces a **canonical commercial model** to replace scattered boolean flags and implicit state with a single, auditable source of truth for billing, access control, and operational gates.

**Core Problem:** Current system has:
- Billing logic scattered across Client model, twilio.ts, and commented-out stripe.ts
- 11 `as any` casts masking non-existent fields
- No clear billing lifecycle model
- Implicit coupling between payment state and operational gates

**Solution:** Introduce dedicated models for:
1. **Billing state** (trial, active, delinquent, canceled)
2. **Operational controls** (kill switches, feature flags)
3. **Clear admin surface** (operator cockpit contracts)

---

## 1️⃣ TECHNICAL DEBT AUDIT

### Current `as any` Cast Inventory

| Field | Location | Count | Purpose | Status in DB |
|-------|----------|-------|---------|--------------|
| `outboundPaused` | KillSwitch.ts, SystemGate.ts | 2 | Emergency SMS kill switch | ❌ Not in DB |
| `aiDisabled` | KillSwitch.ts, SystemGate.ts | 2 | Force deterministic fallback | ❌ Not in DB |
| `pendingCancellation` | twilio.ts | 4 | Cancellation confirmation flow | ❌ Not in DB |
| `cancellationRequestedAt` | twilio.ts | 3 | Cancellation timeout tracking | ❌ Not in DB |
| `billingStatus` | twilio.ts | 3 | Trial/active/canceled state | ❌ Not in DB |
| `trialUsedAt` | twilio.ts | 1 | One-trial-per-phone enforcement | ❌ Not in DB |

**Total:** 11 type safety violations

### Existing DB Fields (Billing-Adjacent)

| Field | Type | Usage | Problem |
|-------|------|-------|---------|
| `paymentActive` | Boolean | 6 files | Binary flag - no context about WHY or WHEN |
| `opsAlertsMuted` | Boolean | admin.ts, StuckClientDetector | Valid operational control |
| `paymentGateAlertedAt` | DateTime? | StuckClientDetector | Ephemeral alerting state - acceptable |
| `paymentGateAlertCount` | Int | StuckClientDetector | Ephemeral alerting state - acceptable |

---

## 2️⃣ DECISION TABLE: KEEP vs DELETE

### ✅ FORMALIZE (Move to proper model)

| Field | Rationale | Destination Model | Priority |
|-------|-----------|------------------|----------|
| `billingStatus` | **CRITICAL** - Needed for trial/active/canceled lifecycle | `ClientBilling` | P0 |
| `trialUsedAt` | **HIGH** - Prevents trial abuse (one-trial-per-phone) | `ClientBilling` | P0 |
| `outboundPaused` | **HIGH** - Emergency kill switch for SMS spam | `ClientControls` | P1 |
| `aiDisabled` | **MEDIUM** - Cost control + debugging fallback | `ClientControls` | P1 |

**Justification:**
- These represent real business requirements
- Currently implemented but type-unsafe
- Have clear ownership models
- Are actively used in production logic

### ❌ DELETE (Cancel cancellation flow)

| Field | Rationale | Deletion Scope |
|-------|-----------|----------------|
| `pendingCancellation` | Overengineered for MVP - adds complexity without value | Remove from twilio.ts |
| `cancellationRequestedAt` | Part of pending cancellation flow - not needed | Remove from twilio.ts |

**Justification:**
- Cancellation flow in twilio.ts is SMS-based confirmation with 24h timeout
- Adds ~80 lines of state management for edge case
- Client can cancel via support/admin instead
- NOT a core product feature
- Stripe native cancellation is superior when re-enabled

**Impact Analysis:**
- Remove "CANCEL" keyword handler from twilio.ts (~120 lines)
- Remove YES/NO confirmation flow (~60 lines)
- Simplifies twilio.ts by ~30%
- No data loss (fields never existed in DB)

---

## 3️⃣ CANONICAL BILLING MODEL DESIGN

### Schema: `ClientBilling`

```prisma
model ClientBilling {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Foreign key
  clientId  String   @unique @map("client_id")
  client    Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)

  // Billing lifecycle (SINGLE SOURCE OF TRUTH)
  status           BillingStatus        @default(TRIAL_PENDING) @map("status")
  paymentSource    PaymentSource        @default(NONE) @map("payment_source")

  // Trial tracking (one-trial-per-phone enforcement)
  trialUsedAt      DateTime?            @map("trial_used_at")
  trialStartedAt   DateTime?            @map("trial_started_at")
  trialEndsAt      DateTime?            @map("trial_ends_at")

  // Subscription tracking
  subscriptionStartedAt DateTime?       @map("subscription_started_at")
  subscriptionEndsAt    DateTime?       @map("subscription_ends_at")

  // External payment provider references (nullable - not all clients use Stripe)
  stripeCustomerId      String?         @map("stripe_customer_id")
  stripeSubscriptionId  String?         @map("stripe_subscription_id")

  // Last billing event (for audit trail)
  lastBillingEventAt    DateTime?       @map("last_billing_event_at")
  lastBillingEventType  String?         @map("last_billing_event_type")

  @@index([status])
  @@index([paymentSource])
  @@map("client_billing")
}

enum BillingStatus {
  TRIAL_PENDING       // Onboarding not complete
  TRIAL_ACTIVE        // 7-day trial running
  TRIAL_EXPIRED       // Trial ended, no payment
  ACTIVE              // Paying customer
  DELINQUENT          // Payment failed
  CANCELED            // Explicitly canceled
  SUSPENDED           // Admin/system suspended
}

enum PaymentSource {
  NONE                // No payment method
  STRIPE              // Stripe subscription
  MANUAL              // Manual invoicing (enterprise)
  WAIVED              // Free tier (partnerships, etc.)
}
```

### Schema: `ClientControls`

```prisma
model ClientControls {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Foreign key
  clientId  String   @unique @map("client_id")
  client    Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)

  // Kill switches (operator controls)
  outboundPaused       Boolean   @default(false) @map("outbound_paused")
  outboundPausedAt     DateTime? @map("outbound_paused_at")
  outboundPausedReason String?   @map("outbound_paused_reason")

  aiDisabled           Boolean   @default(false) @map("ai_disabled")
  aiDisabledAt         DateTime? @map("ai_disabled_at")
  aiDisabledReason     String?   @map("ai_disabled_reason")

  @@map("client_controls")
}
```

### Design Rationale

**Why separate `ClientBilling` and `ClientControls`?**

1. **Different lifecycles:**
   - Billing: Driven by external events (Stripe webhooks, admin actions)
   - Controls: Driven by operator decisions (debugging, abuse prevention)

2. **Different access patterns:**
   - Billing: Read-heavy, infrequent writes, audit-critical
   - Controls: Write-heavy, toggle-based, operator-initiated

3. **Different scaling characteristics:**
   - Billing: May need separate audit log table
   - Controls: In-memory caching for performance

4. **Clear ownership:**
   - Billing: Finance/product domain
   - Controls: Operations/reliability domain

**Why NOT embed in `Client`?**

- Client model is foundational identity (businessName, region, phoneNumber)
- Billing and controls are *attributes* of client, not identity
- Allows independent schema evolution
- Enables targeted indexing and querying

---

## 4️⃣ FIELD-BY-FIELD MIGRATION PLAN

### `paymentActive` → `ClientBilling.status`

**Current Usage:**
```typescript
if (!client.paymentActive) {
  // Block onboarding progression
}
```

**New Usage:**
```typescript
if (!isPaymentValid(billing.status)) {
  // Block onboarding progression
}

function isPaymentValid(status: BillingStatus): boolean {
  return [
    BillingStatus.TRIAL_ACTIVE,
    BillingStatus.ACTIVE
  ].includes(status);
}
```

**Migration:**
- Add `ClientBilling` table
- Backfill: `paymentActive=true` → `ACTIVE`, `paymentActive=false` → `TRIAL_PENDING`
- Update all 6 files referencing `paymentActive`
- Remove `paymentActive` from Client schema

---

## 5️⃣ ADMIN CONTROL SURFACE DESIGN

### Route: `POST /api/admin/clients/:id/billing`

**Purpose:** View complete billing state for operator cockpit

**Response:**
```typescript
{
  client: {
    id: string;
    businessName: string;
    phoneNumber: string;
    onboardingComplete: boolean; // derived
  },
  billing: {
    status: BillingStatus;
    paymentSource: PaymentSource;
    trialUsedAt: DateTime | null;
    trialEndsAt: DateTime | null;
    subscriptionEndsAt: DateTime | null;
    lastBillingEventAt: DateTime | null;
    lastBillingEventType: string | null;
  },
  controls: {
    outboundPaused: boolean;
    outboundPausedReason: string | null;
    aiDisabled: boolean;
    aiDisabledReason: string | null;
  },
  blockedReasons: string[]; // Human-readable explanations
}
```

### Route: `POST /api/admin/clients/:id/controls/pause-outbound`

**Purpose:** Emergency kill switch for SMS spam

**Request:**
```typescript
{
  reason: string; // Required - operator must explain
  duration?: number; // Optional - auto-resume in N hours
}
```

**Safety Invariants:**
- MUST provide reason (audit trail)
- MUST check operator permissions (future: RBAC)
- MUST log action to audit table
- MUST send alert to ops channel

**Response:**
```typescript
{
  success: boolean;
  controls: {
    outboundPaused: true;
    outboundPausedAt: DateTime;
    outboundPausedReason: string;
  }
}
```

### Route: `POST /api/admin/clients/:id/controls/toggle-ai`

**Purpose:** Disable AI for cost control or debugging

**Request:**
```typescript
{
  enabled: boolean;
  reason: string; // Required
}
```

**Safety Invariants:**
- Same as pause-outbound

### Route: `POST /api/admin/clients/:id/billing/cancel`

**Purpose:** Force cancel subscription (destructive)

**Request:**
```typescript
{
  reason: string; // Required
  immediate: boolean; // true = cancel now, false = end of period
  confirmBusinessName: string; // Typo protection
}
```

**Safety Invariants:**
- MUST NOT allow if client has active bookings in next 7 days
- MUST match business name exactly
- MUST send confirmation email to client
- MUST log to audit trail
- MUST alert ops channel

**Response:**
```typescript
{
  success: boolean;
  billing: {
    status: BillingStatus.CANCELED;
    subscriptionEndsAt: DateTime;
  },
  warnings: string[]; // e.g., "Client has 3 upcoming bookings"
}
```

---

## 6️⃣ STRIPE REINTEGRATION PLAN

### ⚠️ DO NOT IMPLEMENT YET

**Why Stripe is commented out:**
- Uses non-existent fields (billingStatus, trialStartedAt, stripeCustomerId, etc.)
- No canonical billing model to receive events
- No idempotency guarantees
- No failure recovery

### Event-Driven State Transitions

**Stripe Event → Billing State Table**

| Stripe Event | Current Billing Status | New Billing Status | Side Effects |
|--------------|----------------------|-------------------|--------------|
| `checkout.session.completed` | Any | `TRIAL_ACTIVE` | Set `trialStartedAt`, `trialEndsAt` (+7 days), `stripeCustomerId` |
| `customer.subscription.created` | `TRIAL_ACTIVE` | `ACTIVE` | Set `subscriptionStartedAt`, `stripeSubscriptionId` |
| `customer.subscription.deleted` | `ACTIVE` or `DELINQUENT` | `CANCELED` | Set `subscriptionEndsAt` |
| `invoice.payment_failed` | `ACTIVE` | `DELINQUENT` | Send alert, set `lastBillingEventAt` |
| `invoice.payment_succeeded` | `DELINQUENT` | `ACTIVE` | Clear delinquent flag |

### Idempotency Strategy

```typescript
async function handleStripeWebhook(event: Stripe.Event) {
  // 1. Check if event already processed
  const existing = await prisma.billingEvent.findUnique({
    where: { stripeEventId: event.id }
  });

  if (existing) {
    console.log(`[Stripe] Event ${event.id} already processed`);
    return { received: true };
  }

  // 2. Process event in transaction
  await prisma.$transaction(async (tx) => {
    // Update billing state
    await tx.clientBilling.update({ ... });

    // Record event (prevents re-processing)
    await tx.billingEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        processedAt: new Date(),
      }
    });
  });
}
```

### Failure Scenarios

| Scenario | Detection | Recovery |
|----------|-----------|----------|
| Webhook delivery fails | Stripe retry (automatic) | Re-process idempotently |
| Database write fails | Transaction rollback | Log error, manual review |
| Client not found | Validate phone number in metadata | Alert ops, manual intervention |
| Invalid state transition | Validation logic | Reject webhook, alert ops |
| Duplicate webhook | `billingEvent` table lookup | Skip processing |

### Why This Cannot Be Rushed

1. **No billing model exists** - Need `ClientBilling` table first
2. **No idempotency table** - Need `BillingEvent` table for deduplication
3. **No state validation** - Need billing status enum + transition rules
4. **No failure recovery** - Need dead letter queue + manual review process
5. **No testing** - Need Stripe test mode webhooks + local testing

**Estimated Effort:** 2-3 days after Tier 2 billing model is in place

---

## 7️⃣ IMPLEMENTATION SEQUENCE

### Phase 1: Schema Migration (Day 1)

1. Add `ClientBilling` table to schema.prisma
2. Add `ClientControls` table to schema.prisma
3. Add `BillingEvent` table to schema.prisma (for Stripe idempotency)
4. Generate migration
5. **Manual backfill:**
   - For each client: Create `ClientBilling` record
   - If `paymentActive=true` → status=`ACTIVE`
   - If `paymentActive=false` → status=`TRIAL_PENDING`
   - Create `ClientControls` record with defaults

### Phase 2: Code Migration (Day 2)

1. Create `apps/backend/src/utils/billingUtils.ts`:
   - `isPaymentValid(status: BillingStatus): boolean`
   - `canAccessFeature(billing: ClientBilling): boolean`
   - `getBillingStatusDisplay(status: BillingStatus): string`

2. Update files using `paymentActive` (6 files):
   - Load `clientBilling` relation
   - Replace `client.paymentActive` with `isPaymentValid(billing.status)`

3. Update files using `as any` casts (3 files):
   - KillSwitch.ts: Load `clientControls`, check `outboundPaused` / `aiDisabled`
   - SystemGate.ts: Load `clientControls`, check fields
   - twilio.ts: Delete cancellation flow (~180 lines)

### Phase 3: Admin Routes (Day 3)

1. Implement `GET /api/admin/clients/:id/billing`
2. Implement `POST /api/admin/clients/:id/controls/pause-outbound`
3. Implement `POST /api/admin/clients/:id/controls/toggle-ai`
4. Implement `POST /api/admin/clients/:id/billing/cancel`

### Phase 4: Validation (Day 4)

1. Run migration on staging DB
2. Verify backfill correctness
3. Test admin routes with real data
4. Verify all guard logic works with new models
5. Confirm system boots and operates normally

---

## 8️⃣ TIER 2 → TIER 3 BOUNDARY

### What Tier 2 Delivers

✅ **Schema:**
- `ClientBilling` model (canonical commercial state)
- `ClientControls` model (operational kill switches)
- `BillingEvent` model (Stripe idempotency)

✅ **Code:**
- All `paymentActive` references migrated
- All `as any` casts replaced or deleted
- Admin routes defined and implemented
- Billing utility functions

✅ **Documentation:**
- State transition diagrams
- Admin API contracts
- Stripe reintegration roadmap

### What Tier 3 Will Address

- **Stripe re-enablement** (webhook handlers, state machine)
- **Trial expiration cron job** (TRIAL_ACTIVE → TRIAL_EXPIRED after 7 days)
- **Payment failure handling** (ACTIVE → DELINQUENT → CANCELED flow)
- **Admin UI** (operator cockpit frontend)
- **Audit logging** (all admin actions to separate table)

### Success Criteria for Tier 2

1. ✅ Zero `as any` casts in production code
2. ✅ `paymentActive` removed from Client model
3. ✅ All billing logic uses `ClientBilling.status`
4. ✅ Admin can pause/unpause clients via API
5. ✅ System boots cleanly with new models
6. ✅ All existing features work unchanged

---

## 🚨 RISKS & MITIGATIONS

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Backfill creates incorrect billing states | Medium | High | Manual review of 10 sample clients, rollback plan |
| Migration breaks existing onboarding flow | Low | Critical | Test on staging first, feature flag new code |
| Admin routes expose security holes | Medium | High | Rate limiting, audit logging, IP whitelist |
| Stripe reintegration underestimated | High | Medium | Keep commented out until Tier 3, don't rush |

---

## 📝 OPEN QUESTIONS FOR PRODUCT

1. **Trial Policy:** Should trial be 7 days from onboarding complete or from payment?
2. **Grace Period:** Should DELINQUENT clients get 3 days before CANCELED?
3. **Refunds:** Should admin cancellation trigger prorated refund?
4. **Multi-tier Pricing:** Should billing model support multiple price points?

---

**END OF TIER 2 DESIGN DOCUMENT**
