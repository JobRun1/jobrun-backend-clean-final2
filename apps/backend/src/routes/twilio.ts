import { Router, Request, Response } from "express";
import prisma from "../prisma";
import twilio from "../twilio";

const router = Router();

/**
 * 1) MISSED CALLS
 */
router.post("/calls/missed", async (req: Request, res: Response) => {
  // Comprehensive logging for debugging
  console.log("═══════════════════════════════════════════");
  console.log("📞 MISSED CALL WEBHOOK RECEIVED");
  console.log("Headers:", JSON.stringify(req.headers, null, 2));
  console.log("Content-Type:", req.get("content-type"));
  console.log("Body:", JSON.stringify(req.body, null, 2));
  console.log("Query:", JSON.stringify(req.query, null, 2));
  console.log("═══════════════════════════════════════════");

  try {
    // Defensive check: ensure req.body exists
    if (!req.body || typeof req.body !== "object") {
      console.error("❌ req.body is missing or invalid:", req.body);
      res.set("Content-Type", "text/xml");
      return res.status(400).send("<Response></Response>");
    }

    const from = req.body.From;
    const status = req.body.CallStatus;

    console.log("📞 Parsed values:", { from, status });

    // Validate required fields
    if (!from) {
      console.error("❌ Missing 'From' field in request body");
      res.set("Content-Type", "text/xml");
      return res.status(400).send("<Response></Response>");
    }

    // Validate DEFAULT_CLIENT_ID
    if (!process.env.DEFAULT_CLIENT_ID) {
      console.error("❌ DEFAULT_CLIENT_ID environment variable not set");
      res.set("Content-Type", "text/xml");
      return res.status(500).send("<Response></Response>");
    }

    // ✅ FIX: Upsert lead instead of always creating
    console.log("✅ Upserting lead for phone:", from);
    const lead = await prisma.lead.upsert({
      where: {
        clientId_phone: {
          clientId: process.env.DEFAULT_CLIENT_ID,
          phone: from,
        },
      },
      create: {
        clientId: process.env.DEFAULT_CLIENT_ID,
        phone: from,
        source: "INBOUND",
        status: "NEW",
      },
      update: {
        updatedAt: new Date(),
      },
    });
    console.log("✅ Lead upserted:", lead.id);

    console.log("✅ Upserting customer for phone:", from);
    const customer = await prisma.customer.upsert({
      where: {
        clientId_phone: {
          clientId: process.env.DEFAULT_CLIENT_ID,
          phone: from,
        },
      },
      create: {
        clientId: process.env.DEFAULT_CLIENT_ID,
        phone: from,
      },
      update: {},
    });
    console.log("✅ Customer upserted:", customer.id);

    // ✅ FIX: Find existing conversation instead of always creating
    console.log("✅ Finding conversation for customer:", customer.id);
    let conversation = await prisma.conversation.findFirst({
      where: {
        clientId: process.env.DEFAULT_CLIENT_ID,
        customerId: customer.id,
      },
    });

    if (!conversation) {
      console.log("✅ No conversation found, creating new one...");
      conversation = await prisma.conversation.create({
        data: {
          clientId: process.env.DEFAULT_CLIENT_ID,
          customerId: customer.id,
        },
      });
      console.log("✅ Conversation created:", conversation.id);
    } else {
      console.log("✅ Using existing conversation:", conversation.id);
    }

    console.log("✅ Creating system message...");
    await prisma.message.create({
      data: {
        clientId: process.env.DEFAULT_CLIENT_ID,
        customerId: customer.id,
        conversationId: conversation.id,
        direction: "SYSTEM",
        type: "NOTE",
        body: `Missed call detected (status=${status || "unknown"}).`,
      },
    });
    console.log("✅ System message created");

    console.log("✅ Sending SMS to:", from);
    await twilio.messages.create({
      from: process.env.TWILIO_NUMBER!,
      to: from,
      body: "Hi! We noticed you called — how can we help?",
    });
    console.log("✅ SMS sent successfully");

    res.set("Content-Type", "text/xml");
    return res.send("<Response></Response>");
  } catch (err) {
    console.error("═══════════════════════════════════════════");
    console.error("❌ MISSED CALL ERROR:");
    console.error(err);
    console.error("═══════════════════════════════════════════");

    // ALWAYS return TwiML, even on error
    res.set("Content-Type", "text/xml");
    return res.status(500).send("<Response></Response>");
  }
});

/**
 * 2) INCOMING SMS
 */
router.post("/sms/incoming", async (req: Request, res: Response) => {
  console.log("═══════════════════════════════════════════");
  console.log("💬 INCOMING SMS WEBHOOK RECEIVED");
  console.log("Headers:", JSON.stringify(req.headers, null, 2));
  console.log("Content-Type:", req.get("content-type"));
  console.log("Body:", JSON.stringify(req.body, null, 2));
  console.log("═══════════════════════════════════════════");

  try {
    if (!req.body || typeof req.body !== "object") {
      console.error("❌ req.body is missing or invalid:", req.body);
      res.set("Content-Type", "text/xml");
      return res.status(400).send("<Response></Response>");
    }

    const from = req.body.From;
    const body = req.body.Body;

    console.log("💬 Parsed values:", { from, body });

    if (!from || !body) {
      console.error("❌ Missing required fields (From or Body)");
      res.set("Content-Type", "text/xml");
      return res.status(400).send("<Response></Response>");
    }

    if (!process.env.DEFAULT_CLIENT_ID) {
      console.error("❌ DEFAULT_CLIENT_ID environment variable not set");
      res.set("Content-Type", "text/xml");
      return res.status(500).send("<Response></Response>");
    }

    console.log("✅ Upserting customer for phone:", from);
    const customer = await prisma.customer.upsert({
      where: {
        clientId_phone: {
          clientId: process.env.DEFAULT_CLIENT_ID,
          phone: from,
        },
      },
      create: {
        clientId: process.env.DEFAULT_CLIENT_ID,
        phone: from,
      },
      update: {},
    });
    console.log("✅ Customer upserted:", customer.id);

    console.log("✅ Finding conversation for customer:", customer.id);
    let conversation = await prisma.conversation.findFirst({
      where: {
        clientId: process.env.DEFAULT_CLIENT_ID,
        customerId: customer.id,
      },
    });

    if (!conversation) {
      console.log("✅ No conversation found, creating new one...");
      conversation = await prisma.conversation.create({
        data: {
          clientId: process.env.DEFAULT_CLIENT_ID,
          customerId: customer.id,
        },
      });
      console.log("✅ Conversation created:", conversation.id);
    } else {
      console.log("✅ Using existing conversation:", conversation.id);
    }

    console.log("✅ Creating inbound message...");
    await prisma.message.create({
      data: {
        clientId: process.env.DEFAULT_CLIENT_ID,
        customerId: customer.id,
        conversationId: conversation.id,
        direction: "INBOUND",
        type: "SMS",
        body,
      },
    });
    console.log("✅ Message stored successfully");

    res.set("Content-Type", "text/xml");
    return res.send("<Response></Response>");
  } catch (err) {
    console.error("═══════════════════════════════════════════");
    console.error("❌ INCOMING SMS ERROR:");
    console.error(err);
    console.error("═══════════════════════════════════════════");

    res.set("Content-Type", "text/xml");
    return res.status(500).send("<Response></Response>");
  }
});

/**
 * 3) SMS STATUS CALLBACK (Sent, Delivered, Failed, etc.)
 */
router.post("/sms/status", async (req, res) => {
  try {
    console.log("📡 SMS Status Callback:", req.body);
    res.set("Content-Type", "text/xml");
    return res.send("<Response></Response>");
  } catch (err) {
    console.error("SMS Status Error:", err);
    res.set("Content-Type", "text/xml");
    return res.send("<Response></Response>");
  }
});

export default router;
