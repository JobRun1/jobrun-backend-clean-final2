import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth";
import { AuthenticatedRequest } from "../types/express";
import { Response } from "express";

const prisma = new PrismaClient();
const router = Router();

// POST /api/demo-mode/toggle
router.post("/toggle", authenticate, async (req: AuthenticatedRequest, res: Response) => {
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

  } catch (err) {
    console.error("DEMO_MODE_TOGGLE_ERROR", err);
    res.status(500).json({ error: "Failed to toggle demo mode." });
  }
});

export default router;
