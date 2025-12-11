import { Router } from "express";
import { prisma } from "../db";
import { sendSuccess, sendError } from "../utils/response";

const router = Router();

/**
 * ⭐ TEMPORARY: Make dashboard stats PUBLIC
 * (The UI cannot authenticate yet — this allows development to continue)
 */

// GET /api/admin/dashboard/stats
router.get("/dashboard/stats", async (req, res) => {
  try {
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

export default router;
