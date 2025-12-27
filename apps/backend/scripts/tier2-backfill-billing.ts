/**
 * TIER 2: BACKFILL BILLING & CONTROLS
 *
 * Migrates existing clients to canonical billing model.
 *
 * LOGIC:
 * - paymentActive = true  → BillingStatus.ACTIVE
 * - paymentActive = false → BillingStatus.TRIAL_PENDING
 * - All clients get default ClientControls (outboundPaused=false, aiDisabled=false)
 *
 * SAFETY:
 * - Idempotent (skips if billing/controls already exist)
 * - Transaction per client (all-or-nothing)
 * - Dry-run mode available
 */

import { prisma } from '../src/db';
import { BillingStatus, PaymentSource } from '@prisma/client';

const DRY_RUN = process.argv.includes('--dry-run');

async function backfillBillingAndControls() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TIER 2: BILLING & CONTROLS BACKFILL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '✅ LIVE'}`);
  console.log('');

  // Load all clients
  const clients = await prisma.client.findMany({
    include: {
      billing: true,
      controls: true,
    },
  });

  console.log(`Found ${clients.length} clients`);
  console.log('');

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const client of clients) {
    try {
      // Skip if already backfilled
      if (client.billing && client.controls) {
        console.log(`⏭️  ${client.id} (${client.businessName}) - already backfilled`);
        skipped++;
        continue;
      }

      // Determine billing status from paymentActive
      const billingStatus = client.paymentActive
        ? BillingStatus.ACTIVE
        : BillingStatus.TRIAL_PENDING;

      console.log(`📋 ${client.id} (${client.businessName})`);
      console.log(`   paymentActive: ${client.paymentActive} → ${billingStatus}`);

      if (!DRY_RUN) {
        await prisma.$transaction(async (tx) => {
          // Create billing record if missing
          if (!client.billing) {
            await tx.clientBilling.create({
              data: {
                clientId: client.id,
                status: billingStatus,
                paymentSource: client.paymentActive
                  ? PaymentSource.STRIPE  // Assume Stripe if paying
                  : PaymentSource.NONE,
              },
            });
            console.log(`   ✅ Created ClientBilling (${billingStatus})`);
          }

          // Create controls record if missing
          if (!client.controls) {
            await tx.clientControls.create({
              data: {
                clientId: client.id,
                outboundPaused: false,
                aiDisabled: false,
              },
            });
            console.log(`   ✅ Created ClientControls (defaults)`);
          }
        });

        created++;
      } else {
        console.log(`   [DRY RUN] Would create billing (${billingStatus}) + controls`);
        created++;
      }

      console.log('');
    } catch (error) {
      console.error(`❌ Error backfilling ${client.id}:`, error);
      errors++;
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('BACKFILL COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log('');

  if (DRY_RUN) {
    console.log('⚠️  THIS WAS A DRY RUN');
    console.log('Run without --dry-run to execute');
  }
}

backfillBillingAndControls()
  .catch((error) => {
    console.error('FATAL ERROR:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
