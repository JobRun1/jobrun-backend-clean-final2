// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CRITICAL: Load environment variables FIRST
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Railway automatically injects environment variables into process.env
// Local development requires dotenv to load from .env file
//
// This MUST happen before ANY other imports to ensure:
// 1. Twilio client has access to TWILIO_ACCOUNT_SID/AUTH_TOKEN
// 2. Prisma client has access to DATABASE_URL
// 3. All modules can safely use process.env values
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if (process.env.RAILWAY_ENVIRONMENT !== "production") {
  console.log("📦 Loading local .env file…");
  require("dotenv").config();
} else {
  console.log("🚀 Running in Railway — using injected environment variables");
}

// Log environment status for debugging
console.log("═══════════════════════════════════════════");
console.log("🔧 ENVIRONMENT LOADED");
console.log("═══════════════════════════════════════════");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "✅ OK" : "❌ MISSING");
console.log("TWILIO_ACCOUNT_SID:", process.env.TWILIO_ACCOUNT_SID ? `✅ ${process.env.TWILIO_ACCOUNT_SID.substring(0, 10)}...` : "❌ MISSING");
console.log("TWILIO_AUTH_TOKEN:", process.env.TWILIO_AUTH_TOKEN ? "✅ OK" : "❌ MISSING");
console.log("TWILIO_NUMBER:", process.env.TWILIO_NUMBER ? `✅ ${process.env.TWILIO_NUMBER}` : "❌ MISSING");
console.log("DEFAULT_CLIENT_ID:", process.env.DEFAULT_CLIENT_ID ? `✅ ${process.env.DEFAULT_CLIENT_ID}` : "❌ MISSING");
console.log("═══════════════════════════════════════════");

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Now safe to import modules that depend on environment variables
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import express from "express";
import cors from "cors";
import http from "http";
import twilioRoutes from "./routes/twilio";

// ✅ Validate critical environment variables
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
    console.error("═══════════════════════════════════════════");
    console.error("❌ MISSING REQUIRED ENVIRONMENT VARIABLES:");
    missing.forEach((key) => console.error(`   - ${key}`));
    console.error("═══════════════════════════════════════════");
    console.error("⚠️  Server will start but webhooks will fail!");
    console.error("═══════════════════════════════════════════");
  } else {
    console.log("✅ All required environment variables present");
  }
}

export function createServer() {
  const app = express();

  // 🔍 Debug logging middleware (BEFORE body parsers)
  app.use((req, res, next) => {
    if (req.path.startsWith("/twilio")) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      console.log("Raw Headers:", req.headers);
    }
    next();
  });

  // Body parsers (correct order for Twilio)
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(cors());

  app.get("/", (req, res) => {
    res.json({
      message: "JobRun backend API is running",
      health: "/api/health",
      version: "/api/version",
    });
  });

  app.get("/api/health", (req, res) => {
    res.json({
      success: true,
      data: { status: "ok", timestamp: new Date().toISOString() },
    });
  });

  app.get("/api/version", (req, res) => {
    res.json({
      success: true,
      data: { name: "jobrun", version: "1.0.0" },
    });
  });

  app.use("/twilio", twilioRoutes);

  return app;
}

async function start() {
  // Validate environment before starting
  validateEnv();

  const app = createServer();
  const server = http.createServer(app);

  const PORT = Number(process.env.PORT) || 3000;

  console.log("═══════════════════════════════════════════");
  console.log("🚀 JobRun Backend Starting");
  console.log("═══════════════════════════════════════════");
  console.log("Environment:", process.env.NODE_ENV || "development");
  console.log("Railway Mode:", process.env.RAILWAY_ENVIRONMENT || "local");
  console.log("Port:", PORT);
  console.log("Database:", process.env.DATABASE_URL ? "✅ Connected" : "❌ Missing");
  console.log("Twilio SID:", process.env.TWILIO_ACCOUNT_SID ? `✅ ${process.env.TWILIO_ACCOUNT_SID.substring(0, 10)}...` : "❌ Missing");
  console.log("Twilio Number:", process.env.TWILIO_NUMBER || "❌ Missing");
  console.log("Default Client:", process.env.DEFAULT_CLIENT_ID || "❌ Missing");
  console.log("═══════════════════════════════════════════");

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Backend listening on 0.0.0.0:${PORT}`);
    console.log("═══════════════════════════════════════════");
  });
}

start();
