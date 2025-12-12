import { Router } from "express";
import { prisma } from "../db";
import { authenticate } from "../middleware/auth";
import { AuthenticatedRequest } from "../types/express";
import { Response } from "express";
const router = Router();

// GET /api/leads — fetch leads for logged-in client
router.get("/", authenticate, async (req: AuthenticatedRequest, res: Response) => {
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
  } catch (err) {
    console.error("LEADS_GET_ERROR", err);
    res.status(500).json({ error: "Could not fetch leads" });
  }
});

// POST /api/leads/fake — generate a fake test lead
router.post("/fake", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const clientId = req.user?.clientId;
    const { date } = req.body;

    console.log("✨ FAKE LEAD: Creating for clientId =", clientId, "with date =", date);

    if (!clientId) {
      return res.status(400).json({ error: "No clientId found for user" });
    }

    // Create customer first (Lead requires customerId)
    const customer = await prisma.customer.create({
      data: {
        clientId,
        phone: "07123456789",
        name: "Test Lead",
        email: "testlead@example.com",
        state: "NEW",
      }
    });

    // Then create lead linked to customer
    const lead = await prisma.lead.create({
      data: {
        clientId,
        customerId: customer.id,
        state: "NEW",
        jobType: "",
        urgency: "",
        location: "",
        requestedTime: "",
        notes: "Fake lead for dashboard testing.",
        createdAt: date ? new Date(date) : new Date()
      }
    });

    console.log("✅ FAKE LEAD CREATED:", lead.id, "for clientId =", clientId, "at", lead.createdAt);

    res.json({ success: true, lead });
  } catch (err) {
    console.error("FAKE_LEAD_ERROR", err);
    res.status(500).json({ error: "Could not create fake lead" });
  }
});

export default router;
