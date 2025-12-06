"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
// Get analytics for the logged-in client
router.get("/client-overview", auth_1.authenticate, async (req, res) => {
    try {
        const clientId = req.user.clientId;
        const range = req.query.range || "all"; // day, week, month, year, all
        console.log("🔍 ANALYTICS: session clientId =", clientId, "range =", range);
        if (!clientId) {
            return res.status(400).json({ error: "No clientId found for user." });
        }
        // Time range boundaries
        const now = new Date();
        let startDate = new Date(0);
        if (range === "day") {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        }
        else if (range === "week") {
            const past = new Date();
            past.setDate(now.getDate() - 7);
            startDate = past;
        }
        else if (range === "month") {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        else if (range === "year") {
            startDate = new Date(now.getFullYear(), 0, 1);
        }
        // Fetch scoped analytics
        const [leads, bookings, messages] = await Promise.all([
            prisma.lead.findMany({
                where: {
                    clientId,
                    createdAt: { gte: startDate }
                },
                orderBy: { createdAt: "asc" }
            }),
            prisma.booking.findMany({
                where: {
                    clientId,
                    createdAt: { gte: startDate }
                },
                orderBy: { createdAt: "asc" }
            }),
            prisma.message.findMany({
                where: {
                    clientId,
                    createdAt: { gte: startDate }
                },
                orderBy: { createdAt: "asc" }
            })
        ]);
        console.log("📊 ANALYTICS RESULTS: leads =", leads.length, "bookings =", bookings.length, "messages =", messages.length);
        res.json({
            success: true,
            range,
            leads,
            bookings,
            messages,
        });
    }
    catch (err) {
        console.error("CLIENT_ANALYTICS_ERROR", err);
        res.status(500).json({ error: "Could not fetch analytics" });
    }
});
// ADMIN VERSION
router.get("/admin-overview", auth_1.authenticate, async (req, res) => {
    try {
        // Fetch full timestamped arrays (for charts)
        const leads = await prisma.lead.findMany({
            orderBy: { createdAt: "asc" },
            select: { id: true, createdAt: true },
        });
        const bookings = await prisma.booking.findMany({
            orderBy: { createdAt: "asc" },
            select: { id: true, createdAt: true },
        });
        const messages = await prisma.message.findMany({
            orderBy: { createdAt: "asc" },
            select: { id: true, createdAt: true },
        });
        // Keep metrics for KPI cards
        const clients = await prisma.client.count();
        const users = await prisma.user.count();
        res.json({
            success: true,
            leads,
            bookings,
            messages,
            metrics: {
                clients,
                users,
                bookings: bookings.length,
                messages: messages.length,
                leads: leads.length,
            },
        });
    }
    catch (err) {
        console.error("ERROR /analytics/admin-overview", err);
        res.status(500).json({ error: "Failed to load admin analytics." });
    }
});
exports.default = router;
//# sourceMappingURL=analytics.js.map