// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LOAD ENVIRONMENT VARIABLES FIRST (CRITICAL)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Must run BEFORE any imports that rely on process.env.
// Railway injects env vars automatically.
// Local dev needs dotenv.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if (process.env.RAILWAY_ENVIRONMENT !== "production") {
  console.log("📦 Loading local .env file…");
  require("dotenv").config();
} else {
  console.log("🚀 Running in Railway — using injected environment variables");
}

// Pretty environment boot log
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ENVIRONMENT VALIDATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
    console.error("❌ MISSING REQUIRED ENVIRONMENT VARIABLES");
    missing.forEach((key) => console.error(`   - ${key}`));
    console.error("═══════════════════════════════════════════");
    console.error("⚠️  Server booted, BUT Twilio webhooks may fail!");
    console.error("═══════════════════════════════════════════");
  } else {
    console.log("✅ All required environment variables present");
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  EXPRESS APP FACTORY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function createServer() {
  const app = express();

  // Debug only Twilio inbound webhook traffic
  app.use((req, res, next) => {
    if (req.path.startsWith("/twilio")) {
      console.log("────────── Twilio Webhook ──────────");
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      console.log("Headers:", req.headers);
      console.log("────────────── END ─────────────────");
    }
    next();
  });

  // Correct Twilio body parsing order
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(cors());

  // Root status (optional)
  app.get("/", (req, res) => {
    res.json({
      message: "JobRun backend API is running",
      endpoints: {
        health: "/api/health",
        version: "/api/version",
        twilio: "/twilio",
      },
    });
  });

  // Healthcheck endpoint for Railway
  app.get("/api/health", (req, res) => {
    res.json({
      success: true,
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  // API version endpoint
  app.get("/api/version", (req, res) => {
    res.json({
      success: true,
      data: { name: "jobrun", version: "1.0.0" },
    });
  });

  // Twilio inbound webhooks
  app.use("/twilio", twilioRoutes);

  return app;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SERVER START LOGIC
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function start() {
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
  console.log(
    "Database:",
    process.env.DATABASE_URL ? "✅ Connected" : "❌ Missing"
  );
  console.log(
    "Twilio SID:",
    process.env.TWILIO_ACCOUNT_SID
      ? `✅ ${process.env.TWILIO_ACCOUNT_SID.substring(0, 10)}...`
      : "❌ Missing"
  );
  console.log("Twilio Number:", process.env.TWILIO_NUMBER || "❌ Missing");
  console.log(
    "Default Client:",
    process.env.DEFAULT_CLIENT_ID || "❌ Missing"
  );
  console.log("═══════════════════════════════════════════");

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Backend listening on 0.0.0.0:${PORT}`);
    console.log("═══════════════════════════════════════════");
  });
}

start();
