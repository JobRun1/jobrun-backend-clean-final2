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
  } else {
    console.log("✅ All required environment variables present");
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
