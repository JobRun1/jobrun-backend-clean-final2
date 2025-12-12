// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LOAD ENVIRONMENT VARIABLES FIRST (CRITICAL)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if (process.env.RAILWAY_ENVIRONMENT !== "production") {
  console.log("📦 Loading local .env file…");
  require("dotenv").config();
} else {
  console.log("🚀 Running in Railway — using injected environment variables");
}

console.log("═══════════════════════════════════════════");
console.log("🔧 ENVIRONMENT LOADED");
console.log("═══════════════════════════════════════════");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "✅ OK" : "❌ MISSING");
console.log(
  "TWILIO_ACCOUNT_SID:",
  process.env.TWILIO_ACCOUNT_SID
    ? `✅ ${process.env.TWILIO_ACCOUNT_SID.substring(0, 10)}...`
    : "❌ MISSING"
);
console.log(
  "TWILIO_AUTH_TOKEN:",
  process.env.TWILIO_AUTH_TOKEN ? "✅ OK" : "❌ MISSING"
);
console.log(
  "TWILIO_NUMBER:",
  process.env.TWILIO_NUMBER ? `✅ ${process.env.TWILIO_NUMBER}` : "❌ MISSING"
);
console.log(
  "DEFAULT_CLIENT_ID:",
  process.env.DEFAULT_CLIENT_ID
    ? `✅ ${process.env.DEFAULT_CLIENT_ID}`
    : "❌ MISSING"
);
console.log("═══════════════════════════════════════════");

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SAFE TO IMPORT MODULES NOW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import express from "express";
import cors from "cors";
import http from "http";
import { prisma } from "./db";
import twilioRoutes from "./routes/twilio";
import adminRoutes from "./routes/admin";
import adminDemoRoutes from "./routes/admin-demo";
import impersonationRoutes from "./routes/impersonation";
import clientLeadsRoutes from "./routes/client-leads";
import clientMessagesRoutes from "./routes/client-messages";
import clientSettingsRoutes from "./routes/client-settings";
import clientDashboardRoutes from "./routes/client-dashboard";
import onboardRoutes from "./routes/onboard";

// Validate required ENV values
function validateEnv() {
  const required = [
    "DATABASE_URL",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_NUMBER",
    "DEFAULT_CLIENT_ID",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:", missing);
    process.exit(1);
  }

  console.log("✅ All required environment variables present");
}

// Validate default client exists in database
async function validateDefaultClient() {
  const defaultClientId = process.env.DEFAULT_CLIENT_ID!;

  console.log("🔍 Validating default client:", defaultClientId);

  try {
    const client = await prisma.client.findUnique({
      where: { id: defaultClientId },
    });

    if (!client) {
      console.error("❌ FATAL: Default client not found in database");
      console.error(`   Expected client ID: ${defaultClientId}`);
      console.error("   Run SQL fix from deployment docs to create client");
      process.exit(1);
    }

    const clientSettings = await prisma.clientSettings.findUnique({
      where: { clientId: defaultClientId },
    });

    if (!clientSettings) {
      console.error("❌ FATAL: ClientSettings not found for default client");
      console.error(`   Client ID: ${defaultClientId}`);
      console.error("   Run SQL fix from deployment docs to create settings");
      process.exit(1);
    }

    const metadata = clientSettings.metadata as Record<string, unknown> | null;
    const bookingUrl = metadata?.bookingUrl;

    if (!bookingUrl || typeof bookingUrl !== "string") {
      console.error("❌ FATAL: ClientSettings.metadata.bookingUrl is missing");
      console.error(`   Client ID: ${defaultClientId}`);
      console.error("   Run SQL fix to set bookingUrl in metadata");
      process.exit(1);
    }

    console.log("✅ Default client validated:");
    console.log(`   ID: ${client.id}`);
    console.log(`   Business: ${client.businessName}`);
    console.log(`   Booking URL: ${bookingUrl}`);
  } catch (error) {
    console.error("❌ FATAL: Failed to validate default client:", error);
    process.exit(1);
  }
}

// Create Express server
export function createServer() {
  const app = express();

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(cors());

  // Root
  app.get("/", (req, res) => {
    res.json({
      message: "JobRun backend API is running",
      endpoints: {
        admin: "/api/admin",
      },
    });
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/version", (req, res) => {
    res.json({ version: "1.0.0" });
  });

  // Routes
  app.use("/twilio", twilioRoutes);
  app.use("/api/admin", adminRoutes); // ⭐ CRITICAL MOUNT
  app.use("/api/admin/demo", adminDemoRoutes);
  app.use("/api/impersonate", impersonationRoutes);
  app.use("/api/client/leads", clientLeadsRoutes);
  app.use("/api/client/messages", clientMessagesRoutes);
  app.use("/api/client/settings", clientSettingsRoutes);
  app.use("/api/client/dashboard", clientDashboardRoutes);
  app.use("/api/onboard", onboardRoutes);

  return app;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  START SERVER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function start() {
  validateEnv();
  await validateDefaultClient();

  const app = createServer();
  const server = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3001;

  console.log("🚀 JobRun Backend Starting");
  console.log("Port:", PORT);

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Backend listening on 0.0.0.0:${PORT}`);
  });
}

start();
