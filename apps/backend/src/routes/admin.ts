import { Router } from "express";
import { prisma } from "../db";
import { sendSuccess, sendError } from "../utils/response";
import { StuckClientDetector } from "../services/StuckClientDetector";
import { isOnboardingComplete } from "../utils/onboardingUtils";
import { isPaymentValid } from "../utils/billingUtils";

const router = Router();

/**
 * ⭐ TEMPORARY: Make dashboard stats PUBLIC
 * (The UI cannot authenticate yet — this allows development to continue)
 */

// GET /api/admin/dashboard/stats
router.get("/dashboard/stats", async (req, res) => {
  try {
    // Ensure Prisma connection is active for admin queries
    await prisma.$connect();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalClients,
      activeClients,
      totalLeads,
      leadsToday,
      totalMessages,
      messagesToday,
      convertedLeads,
      allLeads,
      recentMessages,
      topClients
    ] = await Promise.all([
      prisma.client.count(),
      prisma.client.count({
        where: {
          messages: {
            some: {
              createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            }
          }
        }
      }),
      prisma.customer.count(),
      prisma.customer.count({
        where: { createdAt: { gte: startOfToday } }
      }),
      prisma.message.count(),
      prisma.message.count({
        where: { createdAt: { gte: startOfToday } }
      }),
      prisma.customer.count({
        where: { state: "CONVERTED" }
      }),
      prisma.customer.count(),
      prisma.message.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          client: { select: { businessName: true } }
        }
      }),
      prisma.client.findMany({
        take: 5,
        include: {
          _count: { select: { customers: true, messages: true } }
        },
        orderBy: {
          messages: { _count: "desc" }
        }
      })
    ]);

    const conversionRate = allLeads > 0 ? Math.round((convertedLeads / allLeads) * 100) : 0;

    // Map CustomerState enum to frontend LeadState expectations
    const newCount = await prisma.customer.count({ where: { state: "NEW" } });
    const qualifiedCount = await prisma.customer.count({ where: { state: "QUALIFIED" } });
    const bookedCount = await prisma.customer.count({ where: { state: "BOOKED" } });
    const lostCount = await prisma.customer.count({ where: { state: "LOST" } });

    const leadStateDistribution = {
      NEW: newCount,
      POST_CALL: 0,
      POST_CALL_REPLIED: 0,
      CUSTOMER_REPLIED: 0,
      QUALIFIED: qualifiedCount,
      BOOKED: bookedCount,
      CONVERTED: convertedLeads,
      LOST: lostCount
    };

    const recentActivity = recentMessages.map((msg) => ({
      id: msg.id,
      type: msg.direction,
      clientName: msg.client?.businessName || "Unknown",
      preview: msg.body.substring(0, 100),
      createdAt: msg.createdAt.toISOString()
    }));

    sendSuccess(res, {
      totalClients,
      activeClients,
      totalLeads,
      leadsToday,
      totalMessages,
      messagesToday,
      conversionRate,
      leadStateDistribution,
      recentActivity,
      topClients: topClients.map((client) => ({
        id: client.id,
        businessName: client.businessName,
        region: client.region,
        leadCount: client._count.customers,
        messageCount: client._count.messages
      }))
    });
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);

    // Isolate Prisma P2022 errors from global state
    if (error instanceof Error && error.message.includes('P2022')) {
      console.error("ADMIN ROUTE SCHEMA ERROR - isolated from SMS pipeline");
    }

    sendError(res, "INTERNAL_ERROR", "Failed to fetch stats", 500);
  }
});

// GET /api/admin/clients
router.get("/clients", async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      include: {
        _count: {
          select: {
            customers: true,
            messages: true,
            bookings: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    sendSuccess(res, { clients });
  } catch (error) {
    console.error("Failed to fetch clients:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to fetch clients", 500);
  }
});

// GET /api/admin/clients/:id
router.get("/clients/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        customers: {
          take: 20,
          orderBy: { createdAt: "desc" }
        },
        messages: {
          take: 50,
          orderBy: { createdAt: "desc" }
        },
        bookings: {
          take: 20,
          orderBy: { start: "desc" }
        },
        _count: {
          select: {
            customers: true,
            messages: true,
            bookings: true
          }
        }
      }
    });

    if (!client) {
      return sendError(res, "NOT_FOUND", "Client not found", 404);
    }

    sendSuccess(res, { client });
  } catch (error) {
    console.error("Failed to fetch client:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to fetch client", 500);
  }
});

// PUT /api/admin/clients/:id
router.put("/clients/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { businessName, phoneNumber, twilioNumber, region, timezone } = req.body;

    // Validate required fields
    if (!businessName || typeof businessName !== "string" || businessName.trim() === "") {
      return sendError(res, "INVALID_INPUT", "Business name is required", 400);
    }

    if (!timezone || typeof timezone !== "string" || timezone.trim() === "") {
      return sendError(res, "INVALID_INPUT", "Timezone is required", 400);
    }

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: { id }
    });

    if (!existingClient) {
      return sendError(res, "NOT_FOUND", "Client not found", 404);
    }

    // Update client
    const updatedClient = await prisma.client.update({
      where: { id },
      data: {
        businessName: businessName.trim(),
        phoneNumber: phoneNumber?.trim() || null,
        twilioNumber: twilioNumber?.trim() || null,
        region: region?.trim() || null,
        timezone: timezone.trim()
      }
    });

    sendSuccess(res, { client: updatedClient });
  } catch (error) {
    console.error("Failed to update client:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to update client", 500);
  }
});

// POST /api/admin/clients/:id/impersonate
router.post("/clients/:id/impersonate", async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.body.adminId || "admin"; // TODO: Get from auth session

    const client = await prisma.client.findUnique({
      where: { id }
    });

    if (!client) {
      return sendError(res, "NOT_FOUND", "Client not found", 404);
    }

    // Generate impersonation token
    const { generateImpersonationToken } = await import('../utils/jwt');
    const token = generateImpersonationToken(client.id, adminId);

    // Log impersonation for audit trail
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    await prisma.impersonationLog.create({
      data: {
        adminId,
        clientId: client.id,
        expiresAt
      }
    });

    sendSuccess(res, {
      token,
      clientId: client.id,
      businessName: client.businessName,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    console.error("Failed to impersonate client:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to impersonate client", 500);
  }
});

// GET /api/admin/calendar
router.get("/calendar", async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      take: 100,
      orderBy: { start: "desc" },
      include: {
        client: {
          select: {
            businessName: true
          }
        },
        customer: {
          select: {
            name: true,
            phone: true
          }
        }
      }
    });

    sendSuccess(res, { bookings });
  } catch (error) {
    console.error("Failed to fetch calendar:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to fetch calendar", 500);
  }
});

// GET /api/admin/analytics
router.get("/analytics", async (req, res) => {
  try {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalMessages,
      totalCustomers,
      totalBookings,
      messagesLast30Days,
      customersLast30Days,
      bookingsLast30Days
    ] = await Promise.all([
      prisma.message.count(),
      prisma.customer.count(),
      prisma.booking.count(),
      prisma.message.count({ where: { createdAt: { gte: last30Days } } }),
      prisma.customer.count({ where: { createdAt: { gte: last30Days } } }),
      prisma.booking.count({ where: { createdAt: { gte: last30Days } } })
    ]);

    sendSuccess(res, {
      totals: {
        messages: totalMessages,
        customers: totalCustomers,
        bookings: totalBookings
      },
      last30Days: {
        messages: messagesLast30Days,
        customers: customersLast30Days,
        bookings: bookingsLast30Days
      }
    });
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to fetch analytics", 500);
  }
});

// GET /api/admin/agents
router.get("/agents", async (req, res) => {
  try {
    const agentLogs = await prisma.agentLog.findMany({
      take: 100,
      orderBy: { createdAt: "desc" }
    });

    const agentStats = await prisma.agentLog.groupBy({
      by: ["agentName"],
      _count: {
        agentName: true
      },
      _avg: {
        executionTimeMs: true
      }
    });

    sendSuccess(res, {
      logs: agentLogs,
      stats: agentStats
    });
  } catch (error) {
    console.error("Failed to fetch agents:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to fetch agents", 500);
  }
});

// GET /api/admin/agents/:name
router.get("/agents/:name", async (req, res) => {
  try {
    const { name } = req.params;

    const logs = await prisma.agentLog.findMany({
      where: { agentName: name },
      take: 50,
      orderBy: { createdAt: "desc" }
    });

    sendSuccess(res, { logs });
  } catch (error) {
    console.error("Failed to fetch agent logs:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to fetch agent logs", 500);
  }
});

// GET /api/admin/messages
router.get("/messages", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
        include: {
          client: {
            select: {
              businessName: true,
              region: true
            }
          },
          customer: {
            select: {
              name: true,
              phone: true
            }
          }
        }
      }),
      prisma.message.count()
    ]);

    sendSuccess(res, {
      messages: messages.map(msg => ({
        id: msg.id,
        createdAt: msg.createdAt.toISOString(),
        direction: msg.direction,
        type: msg.type,
        body: msg.body,
        clientName: msg.client?.businessName || "Unknown",
        clientRegion: msg.client?.region || "",
        customerName: msg.customer?.name || "",
        customerPhone: msg.customer?.phone || "",
        twilioSid: msg.twilioSid
      })),
      total
    });
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to fetch messages", 500);
  }
});

// GET /api/admin/system
router.get("/system", async (req, res) => {
  try {
    const [
      clientCount,
      customerCount,
      messageCount,
      bookingCount,
      agentLogCount
    ] = await Promise.all([
      prisma.client.count(),
      prisma.customer.count(),
      prisma.message.count(),
      prisma.booking.count(),
      prisma.agentLog.count()
    ]);

    sendSuccess(res, {
      database: {
        clients: clientCount,
        customers: customerCount,
        messages: messageCount,
        bookings: bookingCount,
        agentLogs: agentLogCount
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || "unknown",
        databaseConnected: true
      },
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    console.error("Failed to fetch system info:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to fetch system info", 500);
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STUCK CLIENT DETECTION (Production Hardening)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * GET /api/admin/stuck-clients
 *
 * Returns all clients currently stuck in onboarding.
 *
 * This is the PRIMARY interface for operators to answer:
 * "Which clients need my attention right now, and why?"
 *
 * Response includes:
 * - Total count
 * - Breakdown by state and severity
 * - Detailed client list with actionable information
 *
 * Usage:
 *   curl http://localhost:3001/api/admin/stuck-clients
 *   curl http://localhost:3001/api/admin/stuck-clients?severity=HIGH
 *   curl http://localhost:3001/api/admin/stuck-clients?terminal=true
 */
router.get("/stuck-clients", async (req, res) => {
  try {
    const severityFilter = req.query.severity as string | undefined;
    const terminalFilter = req.query.terminal === "true";

    let summary = await StuckClientDetector.detectStuckClients();

    // Apply filters if provided
    if (severityFilter) {
      summary.clients = summary.clients.filter(
        (c) => c.severity === severityFilter.toUpperCase()
      );
      summary.total = summary.clients.length;
    }

    if (terminalFilter) {
      summary.clients = summary.clients.filter((c) => c.isTerminal);
      summary.total = summary.clients.length;
    }

    sendSuccess(res, {
      timestamp: new Date().toISOString(),
      ...summary,
    });
  } catch (error) {
    console.error("Failed to detect stuck clients:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to detect stuck clients", 500);
  }
});

/**
 * GET /api/admin/stuck-clients/terminal
 *
 * Returns only terminal stuck clients (those requiring manual intervention).
 */
router.get("/stuck-clients/terminal", async (req, res) => {
  try {
    const clients = await StuckClientDetector.getTerminalStuckClients();

    sendSuccess(res, {
      timestamp: new Date().toISOString(),
      total: clients.length,
      clients,
    });
  } catch (error) {
    console.error("Failed to fetch terminal stuck clients:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to fetch terminal stuck clients", 500);
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OPERATOR COCKPIT V1 — OPS ALERTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * GET /api/admin/alerts
 *
 * Returns recent ops alerts from AlertLog.
 * Allows filtering by alertType, severity, and time range.
 *
 * Query params:
 * - limit: number of alerts to return (default: 50, max: 200)
 * - alertType: filter by alert type (e.g., "STUCK_CLIENT", "PAYMENT_BLOCK")
 * - severity: filter by severity (e.g., "HIGH", "CRITICAL")
 * - resourceId: filter by specific resource (e.g., client ID)
 *
 * Usage:
 *   GET /api/admin/alerts
 *   GET /api/admin/alerts?limit=100&severity=CRITICAL
 *   GET /api/admin/alerts?alertType=PAYMENT_BLOCK
 */
router.get("/alerts", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const alertTypeFilter = req.query.alertType as string | undefined;
    const severityFilter = req.query.severity as string | undefined;
    const resourceIdFilter = req.query.resourceId as string | undefined;

    const where: any = {};
    if (alertTypeFilter) where.alertType = alertTypeFilter;
    if (severityFilter) where.severity = severityFilter;
    if (resourceIdFilter) where.resourceId = resourceIdFilter;

    const [alerts, total] = await Promise.all([
      prisma.alertLog.findMany({
        where,
        take: limit,
        orderBy: { deliveredAt: "desc" },
      }),
      prisma.alertLog.count({ where }),
    ]);

    sendSuccess(res, {
      alerts,
      total,
      showing: alerts.length,
    });
  } catch (error) {
    console.error("Failed to fetch alerts:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to fetch alerts", 500);
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OPERATOR COCKPIT V1 — CLIENT CONTROL (SOFT RESETS)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * PATCH /api/admin/clients/:id/mute-alerts
 *
 * Toggles opsAlertsMuted flag for a client.
 * When muted, ops alerts will not be sent (useful for testing/demos).
 *
 * Body: { muted: boolean }
 *
 * SAFETY: This does NOT affect data, only alert delivery.
 */
router.patch("/clients/:id/mute-alerts", async (req, res) => {
  try {
    const { id } = req.params;
    const { muted } = req.body;

    if (typeof muted !== "boolean") {
      return sendError(res, "INVALID_INPUT", "muted must be a boolean", 400);
    }

    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) {
      return sendError(res, "NOT_FOUND", "Client not found", 404);
    }

    // Phase 5: Update ClientControls instead of Client
    const updated = await prisma.clientControls.upsert({
      where: { clientId: id },
      create: {
        clientId: id,
        opsAlertsMuted: muted,
      },
      update: {
        opsAlertsMuted: muted,
      },
    });

    console.log(`[AdminCockpit] Alerts ${muted ? "MUTED" : "UNMUTED"} for client ${id} (${client.businessName})`);

    sendSuccess(res, {
      clientId: client.id,
      businessName: client.businessName,
      opsAlertsMuted: updated.opsAlertsMuted,
    });
  } catch (error) {
    console.error("Failed to mute alerts:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to mute alerts", 500);
  }
});

/**
 * PATCH /api/admin/clients/:id/reset-payment-alert
 *
 * Clears paymentGateAlertedAt to allow payment gate alerts to fire again.
 *
 * Use case: Client was alerted about payment block, resolved issue, but alert
 * suppression prevents re-alerting if they get stuck again.
 *
 * SAFETY: Does NOT affect payment state or data.
 */
router.patch("/clients/:id/reset-payment-alert", async (req, res) => {
  try {
    const { id } = req.params;

    const client = await prisma.client.findUnique({
      where: { id },
      include: { controls: true },
    });
    if (!client) {
      return sendError(res, "NOT_FOUND", "Client not found", 404);
    }

    // Phase 5: Update ClientControls instead of Client
    const updated = await prisma.clientControls.upsert({
      where: { clientId: id },
      create: {
        clientId: id,
        paymentGateAlertedAt: null,
      },
      update: {
        paymentGateAlertedAt: null,
      },
    });

    console.log(`[AdminCockpit] Payment gate alert RESET for client ${id} (${client.businessName})`);
    console.log(`   Previous alert: ${client.controls?.paymentGateAlertedAt?.toISOString() || "never"}`);

    sendSuccess(res, {
      clientId: client.id,
      businessName: client.businessName,
      paymentGateAlertedAt: updated.paymentGateAlertedAt,
      message: "Payment gate alert suppression cleared. Client can be alerted again if stuck.",
    });
  } catch (error) {
    console.error("Failed to reset payment alert:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to reset payment alert", 500);
  }
});

/**
 * PATCH /api/admin/clients/:id/reset-stuck
 *
 * Clears stuckDetectedAt on OnboardingState to reset stuck client detection.
 *
 * Use case: Client was marked as stuck, operator manually intervened,
 * want to reset detection so alerts can fire again if needed.
 *
 * SAFETY: Does NOT affect onboarding state or data.
 */
router.patch("/clients/:id/reset-stuck", async (req, res) => {
  try {
    const { id } = req.params;

    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) {
      return sendError(res, "NOT_FOUND", "Client not found", 404);
    }

    const onboardingState = await prisma.onboardingState.findUnique({
      where: { clientId: id },
    });

    if (!onboardingState) {
      return sendError(res, "NOT_FOUND", "No onboarding state found for this client", 404);
    }

    const updated = await prisma.onboardingState.update({
      where: { clientId: id },
      data: { stuckDetectedAt: null },
    });

    console.log(`[AdminCockpit] Stuck detection RESET for client ${id} (${client.businessName})`);
    console.log(`   Previous detection: ${onboardingState.stuckDetectedAt?.toISOString() || "never"}`);

    sendSuccess(res, {
      clientId: id,
      businessName: client.businessName,
      stuckDetectedAt: updated.stuckDetectedAt,
      message: "Stuck detection reset. Client can be detected as stuck again if necessary.",
    });
  } catch (error) {
    console.error("Failed to reset stuck detection:", error);
    sendError(res, "INTERNAL_ERROR", "Failed to reset stuck detection", 500);
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OPERATOR COCKPIT V1 — HARD DELETE (DANGEROUS)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * DELETE /api/admin/clients/:id
 *
 * PERMANENTLY deletes a client and ALL associated data.
 *
 * SAFETY CHECKS (ALL MUST PASS):
 * 1. Client must exist
 * 2. onboardingComplete must be FALSE (inactive clients only)
 * 3. opsAlertsMuted must be TRUE (explicit operator confirmation)
 * 4. billing.status must NOT be TRIAL_ACTIVE or ACTIVE (no active billing)
 * 5. Request body must include { confirmBusinessName: "exact match" }
 *
 * DELETION ORDER (in transaction):
 * 1. Release Twilio number back to pool (if assigned)
 * 2. Delete onboarding states
 * 3. Delete messages
 * 4. Delete customers
 * 5. Delete bookings
 * 6. Delete conversations
 * 7. Delete leads
 * 8. Delete users
 * 9. Delete alert logs (resourceId match)
 * 10. Delete client
 *
 * Body: { confirmBusinessName: string }
 *
 * Returns: { deleted: true, clientId, businessName, deletionLog: {...} }
 *
 * ERROR HANDLING:
 * - Any failure rolls back entire transaction (atomic)
 * - Logs detailed error for investigation
 * - Returns 400 if safety checks fail
 * - Returns 500 if database operation fails
 *
 * CRITICAL: This is IRREVERSIBLE. No backups. No undo.
 */
router.delete("/clients/:id", async (req, res) => {
  const { id } = req.params;
  const { confirmBusinessName } = req.body;

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("⚠️  [AdminCockpit] DELETE REQUEST RECEIVED");
  console.log(`   Client ID: ${id}`);
  console.log(`   Confirmation: ${confirmBusinessName || "(missing)"}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 1: LOAD CLIENT AND VALIDATE EXISTENCE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        onboardingState: true,
        billing: true,
        controls: true, // Phase 5: Include controls for alert checks
      },
    });

    if (!client) {
      console.error(`❌ [AdminCockpit] DELETE REJECTED: Client not found (${id})`);
      return sendError(res, "NOT_FOUND", "Client not found", 404);
    }

    console.log(`✅ [AdminCockpit] Client found: ${client.businessName}`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 2: SAFETY CHECKS (ALL MUST PASS)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const safetyViolations: string[] = [];

    // CHECK 1: Client must be inactive (onboarding not complete)
    if (isOnboardingComplete(client)) {
      safetyViolations.push("Client is ACTIVE (onboarding complete). Cannot delete active clients.");
    }

    // CHECK 2: Alerts must be muted (explicit operator acknowledgment)
    // Phase 5: Check controls table instead of client
    if (!client.controls?.opsAlertsMuted) {
      safetyViolations.push("Alerts NOT muted (opsAlertsMuted=false). Mute alerts first to confirm deletion intent.");
    }

    // CHECK 3: Payment must not be active
    if (client.billing && isPaymentValid(client.billing.status)) {
      safetyViolations.push(`Payment is ACTIVE (status: ${client.billing.status}). Cannot delete paying customers.`);
    }

    // CHECK 4: Business name must match exactly (typo protection)
    if (!confirmBusinessName || confirmBusinessName !== client.businessName) {
      safetyViolations.push(
        `Business name confirmation mismatch. Expected: "${client.businessName}", Got: "${confirmBusinessName || "(missing)"}"`
      );
    }

    if (safetyViolations.length > 0) {
      console.error("❌ [AdminCockpit] DELETE REJECTED: Safety checks failed");
      safetyViolations.forEach((v, i) => console.error(`   ${i + 1}. ${v}`));
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

      return sendError(
        res,
        "SAFETY_CHECK_FAILED",
        "Cannot delete client. Safety checks failed.",
        400,
        { violations: safetyViolations }
      );
    }

    console.log("✅ [AdminCockpit] All safety checks passed");

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 3: EXECUTE DELETION IN TRANSACTION (ATOMIC)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    console.log("⚠️  [AdminCockpit] Beginning IRREVERSIBLE deletion transaction...");

    const deletionLog = await prisma.$transaction(async (tx) => {
      const log: any = {
        clientId: id,
        businessName: client.businessName,
        deletedAt: new Date().toISOString(),
        twilioNumberReleased: null,
        recordsDeleted: {},
      };

      // STEP 3.1: Release Twilio number back to pool (if assigned)
      if (client.twilioNumber) {
        console.log(`   📞 Releasing Twilio number: ${client.twilioNumber}`);

        const poolRecord = await tx.twilioNumberPool.findUnique({
          where: { phoneE164: client.twilioNumber },
        });

        if (poolRecord) {
          await tx.twilioNumberPool.update({
            where: { phoneE164: client.twilioNumber },
            data: {
              status: "AVAILABLE",
              clientId: null,
              assignedAt: null,
            },
          });
          log.twilioNumberReleased = client.twilioNumber;
          console.log(`   ✅ Number released: ${client.twilioNumber}`);
        } else {
          console.warn(`   ⚠️  Twilio number not found in pool: ${client.twilioNumber}`);
        }
      }

      // STEP 3.2: Delete onboarding states
      const deletedOnboardingStates = await tx.onboardingState.deleteMany({
        where: { clientId: id },
      });
      log.recordsDeleted.onboardingStates = deletedOnboardingStates.count;
      console.log(`   ✅ Deleted ${deletedOnboardingStates.count} onboarding states`);

      // STEP 3.3: Delete messages
      const deletedMessages = await tx.message.deleteMany({
        where: { clientId: id },
      });
      log.recordsDeleted.messages = deletedMessages.count;
      console.log(`   ✅ Deleted ${deletedMessages.count} messages`);

      // STEP 3.4: Delete customers
      const deletedCustomers = await tx.customer.deleteMany({
        where: { clientId: id },
      });
      log.recordsDeleted.customers = deletedCustomers.count;
      console.log(`   ✅ Deleted ${deletedCustomers.count} customers`);

      // STEP 3.5: Delete bookings
      const deletedBookings = await tx.booking.deleteMany({
        where: { clientId: id },
      });
      log.recordsDeleted.bookings = deletedBookings.count;
      console.log(`   ✅ Deleted ${deletedBookings.count} bookings`);

      // STEP 3.6: Delete conversations
      const deletedConversations = await tx.conversation.deleteMany({
        where: { clientId: id },
      });
      log.recordsDeleted.conversations = deletedConversations.count;
      console.log(`   ✅ Deleted ${deletedConversations.count} conversations`);

      // STEP 3.7: Delete leads
      const deletedLeads = await tx.lead.deleteMany({
        where: { clientId: id },
      });
      log.recordsDeleted.leads = deletedLeads.count;
      console.log(`   ✅ Deleted ${deletedLeads.count} leads`);

      // STEP 3.8: Delete users
      const deletedUsers = await tx.user.deleteMany({
        where: { clientId: id },
      });
      log.recordsDeleted.users = deletedUsers.count;
      console.log(`   ✅ Deleted ${deletedUsers.count} users`);

      // STEP 3.9: Delete alert logs (resourceId match)
      const deletedAlerts = await tx.alertLog.deleteMany({
        where: { resourceId: id },
      });
      log.recordsDeleted.alertLogs = deletedAlerts.count;
      console.log(`   ✅ Deleted ${deletedAlerts.count} alert logs`);

      // STEP 3.10: Delete the client itself
      await tx.client.delete({
        where: { id },
      });
      console.log(`   ✅ Deleted client: ${client.businessName}`);

      return log;
    });

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ [AdminCockpit] CLIENT DELETED SUCCESSFULLY");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("DELETION LOG:");
    console.log(JSON.stringify(deletionLog, null, 2));
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    sendSuccess(res, {
      deleted: true,
      clientId: id,
      businessName: client.businessName,
      deletionLog,
    });
  } catch (error) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ [AdminCockpit] DELETE FAILED (TRANSACTION ROLLED BACK)");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("Error:", error);
    console.error("Client ID:", id);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    sendError(res, "DELETE_FAILED", "Failed to delete client. Transaction rolled back.", 500);
  }
});

export default router;
