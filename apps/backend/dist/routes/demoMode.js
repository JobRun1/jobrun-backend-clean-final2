"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
// POST /api/demo-mode/toggle
router.post("/toggle", auth_1.authenticate, async (req, res) => {
    try {
        const clientId = req.user?.clientId;
        if (!clientId) {
            return res.status(400).json({ error: "No clientId found for user" });
        }
        console.log("🔄 DEMO MODE TOGGLE: Starting for clientId =", clientId);
        // Fetch current state
        const client = await prisma.client.findUnique({
            where: { id: clientId },
            select: { demoToolsVisible: true },
        });
        if (!client) {
            return res.status(404).json({ error: "Client not found" });
        }
        // Toggle the value
        const newValue = !client.demoToolsVisible;
        await prisma.client.update({
            where: { id: clientId },
            data: { demoToolsVisible: newValue },
        });
        console.log("✅ DEMO MODE TOGGLED:", {
            clientId,
            oldValue: client.demoToolsVisible,
            newValue,
        });
        res.json({
            success: true,
            demoToolsVisible: newValue,
        });
    }
    catch (err) {
        console.error("DEMO_MODE_TOGGLE_ERROR", err);
        res.status(500).json({ error: "Failed to toggle demo mode." });
    }
});
exports.default = router;
//# sourceMappingURL=demoMode.js.map