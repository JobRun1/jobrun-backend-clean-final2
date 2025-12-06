import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth";
import { AuthenticatedRequest } from "../types/express";
import { Response } from "express";

const prisma = new PrismaClient();
const router = Router();

// DELETE /api/fake-data/clear
router.delete("/clear", authenticate, async (req: AuthenticatedRequest, res: Response) => {
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
        source: "FAKE" as any,
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

  } catch (err) {
    console.error("FAKE_DATA_DELETE_ERROR", err);
    res.status(500).json({ error: "Failed to delete fake data." });
  }
});

export default router;
