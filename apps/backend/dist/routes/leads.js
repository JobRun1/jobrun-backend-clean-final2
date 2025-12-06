"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
// GET /api/leads — fetch leads for logged-in client
router.get("/", auth_1.authenticate, async (req, res) => {
    try {
        const clientId = req.user?.clientId;
        if (!clientId) {
            return res.status(400).json({ error: "No clientId found for user" });
        }
        const leads = await prisma.lead.findMany({
            where: { clientId },
            orderBy: { createdAt: "desc" }
        });
        res.json({ leads });
    }
    catch (err) {
        console.error("LEADS_GET_ERROR", err);
        res.status(500).json({ error: "Could not fetch leads" });
    }
});
// POST /api/leads/fake — generate a fake test lead
router.post("/fake", auth_1.authenticate, async (req, res) => {
    try {
        const clientId = req.user?.clientId;
        const { date } = req.body;
        console.log("✨ FAKE LEAD: Creating for clientId =", clientId, "with date =", date);
        if (!clientId) {
            return res.status(400).json({ error: "No clientId found for user" });
        }
        const lead = await prisma.lead.create({
            data: {
                clientId,
                name: "Test Lead",
                phone: "07123456789",
                email: "testlead@example.com",
                status: "NEW",
                source: "FAKE",
                notes: "Fake lead for dashboard testing.",
                createdAt: date ? new Date(date) : new Date()
            }
        });
        console.log("✅ FAKE LEAD CREATED:", lead.id, "for clientId =", clientId, "at", lead.createdAt);
        res.json({ success: true, lead });
    }
    catch (err) {
        console.error("FAKE_LEAD_ERROR", err);
        res.status(500).json({ error: "Could not create fake lead" });
    }
});
exports.default = router;
//# sourceMappingURL=leads.js.map