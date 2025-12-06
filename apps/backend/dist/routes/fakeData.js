"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
// DELETE /api/fake-data/clear
router.delete("/clear", auth_1.authenticate, async (req, res) => {
    try {
        const clientId = req.user?.clientId;
        if (!clientId) {
            return res.status(400).json({ error: "No clientId found for user." });
        }
        console.log("🗑️  FAKE DATA DELETION: Starting for clientId =", clientId);
        // Only delete leads with source=FAKE (Bookings and Messages don't have source field)
        const deletedLeads = await prisma.lead.deleteMany({
            where: {
                clientId,
                source: "FAKE",
            },
        });
        console.log("✅ FAKE DATA DELETED:", {
            leads: deletedLeads.count,
        });
        res.json({
            success: true,
            message: "All fake leads deleted.",
            deleted: {
                leads: deletedLeads.count,
                bookings: 0,
                messages: 0,
            },
        });
    }
    catch (err) {
        console.error("FAKE_DATA_DELETE_ERROR", err);
        res.status(500).json({ error: "Failed to delete fake data." });
    }
});
exports.default = router;
//# sourceMappingURL=fakeData.js.map