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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMERGENCY DEPLOYMENT VERIFICATION (REMOVE AFTER CONFIRMATION)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log("🚨 ALERT GUARD VERSION: PHASE5_EMERGENCY_GUARD_ACTIVE");
console.log("🚨 AlertService emergency suppression is ENABLED");
console.log("🚨 Alerts will be suppressed until Phase 5 migration deployed");
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
import impersonationRoutes from "./routes/impersonation";
import clientLeadsRoutes from "./routes/client-leads";
import clientMessagesRoutes from "./routes/client-messages";
import { validateAllTemplates } from "./safeguards/smsPricingSafeguard";
import clientSettingsRoutes from "./routes/client-settings";
import clientDashboardRoutes from "./routes/client-dashboard";
import onboardRoutes from "./routes/onboard";
// TIER 1: Commented out - uses non-existent DB fields
// import stripeRoutes from "./routes/stripe";
import { checkRuntimeInvariants, formatViolationsForLog } from "./services/HealthCheck";
import { startRuntimeMonitor } from "./services/RuntimeMonitor";
import {
  metrics,
  MetricStartupSuccess,
  MetricBootstrapValidationSuccess,
  MetricBootstrapValidationFailure,
  MetricHealthCheckHealthy,
  MetricHealthCheckUnhealthy,
} from "./services/Metrics";

// Validate required ENV values
function validateEnv() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STARTUP CONTRACT: Environment Validation");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const required = [
    "DATABASE_URL",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_NUMBER",
    "DEFAULT_CLIENT_ID",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("❌ STARTUP CONTRACT VIOLATION");
    console.error("   Missing required environment variables:", missing);
    console.error("   Refusing to start with incomplete configuration");
    process.exit(1);
  }

  console.log("✅ Environment variables validated");
  console.log(`   DATABASE_URL: configured`);
  console.log(`   TWILIO_ACCOUNT_SID: configured`);
  console.log(`   TWILIO_AUTH_TOKEN: configured`);
  console.log(`   TWILIO_NUMBER: ${process.env.TWILIO_NUMBER}`);
  console.log(`   DEFAULT_CLIENT_ID: ${process.env.DEFAULT_CLIENT_ID}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

// Validate default client exists in database
// REFACTORED: Now uses checkRuntimeInvariants() for single source of truth
async function validateDefaultClient() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STARTUP CONTRACT: Bootstrap Data Validation");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const defaultClientId = process.env.DEFAULT_CLIENT_ID!;
  console.log(`Validating bootstrap for client: ${defaultClientId}\n`);

  // Use health check invariant validation for single source of truth
  const result = await checkRuntimeInvariants();

  if (!result.healthy) {
    console.error("❌ STARTUP CONTRACT VIOLATION");
    console.error(formatViolationsForLog(result.violations));
    console.error("Refusing to start with broken bootstrap\n");

    metrics.increment(MetricBootstrapValidationFailure);
    process.exit(1);
  }

  // Log individual invariant results for startup visibility
  console.log(`✅ Default client exists`);
  console.log(`✅ Client settings exist`);
  console.log(`✅ Booking URL valid`);
  console.log("\n✅ BOOTSTRAP VALIDATION COMPLETE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  metrics.increment(MetricBootstrapValidationSuccess);
}

// Track server start time for uptime calculation
const SERVER_START_TIME = Date.now();

// Create Express server
export function createServer() {
  const app = express();

  // TIER 1: Commented out - uses non-existent DB fields
  // CRITICAL: Stripe webhook needs raw body BEFORE json middleware
  // app.use("/api/webhooks", stripeRoutes);

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(cors());

  // Root
  app.get("/", (req, res) => {
    res.json({
      message: "JobRun backend API is running",
      endpoints: {
        admin: "/api/admin",
        health: "/health",
      },
    });
  });

  // Health endpoint (primary) - Reuses invariant logic, safe to poll
  app.get("/health", async (req, res) => {
    const result = await checkRuntimeInvariants();
    const uptimeSeconds = (Date.now() - SERVER_START_TIME) / 1000;

    if (!result.healthy) {
      metrics.increment(MetricHealthCheckUnhealthy);
      return res.status(503).json({
        status: "unhealthy",
        uptime: uptimeSeconds,
        timestamp: result.timestamp,
        violations: result.violations,
        invariants: result.invariants,
      });
    }

    metrics.increment(MetricHealthCheckHealthy);
    res.status(200).json({
      status: "ok",
      uptime: uptimeSeconds,
      timestamp: result.timestamp,
      invariants: result.invariants,
    });
  });

  // Health endpoint (alias at /api/health for backward compatibility)
  app.get("/api/health", async (req, res) => {
    const result = await checkRuntimeInvariants();
    const uptimeSeconds = (Date.now() - SERVER_START_TIME) / 1000;

    if (!result.healthy) {
      metrics.increment(MetricHealthCheckUnhealthy);
      return res.status(503).json({
        status: "unhealthy",
        uptime: uptimeSeconds,
        timestamp: result.timestamp,
        violations: result.violations,
        invariants: result.invariants,
      });
    }

    metrics.increment(MetricHealthCheckHealthy);
    res.status(200).json({
      status: "ok",
      uptime: uptimeSeconds,
      timestamp: result.timestamp,
      invariants: result.invariants,
    });
  });

  app.get("/api/version", (req, res) => {
    res.json({
      version: "1.0.0",
      onboardingSmsVersion: "v2-canonical",
      buildTimestamp: new Date().toISOString(),
      message: "NEW onboarding SMS with canonical sendOnboardingSms() function"
    });
  });

  // Routes
  app.use("/twilio", twilioRoutes);
  app.use("/api/admin", adminRoutes); // ⭐ CRITICAL MOUNT
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

  // CRITICAL: Validate all SMS pricing templates at startup
  // This will THROW if any template contains £29 or incorrect pricing
  validateAllTemplates();

  const app = createServer();
  const server = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3001;

  console.log("🚀 JobRun Backend Starting");
  console.log("Port:", PORT);

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Backend listening on 0.0.0.0:${PORT}`);
    console.log(`🔍 Health endpoint exposed: http://0.0.0.0:${PORT}/health`);

    // Metrics: Startup successful
    metrics.increment(MetricStartupSuccess);

    // Start runtime invariant monitor (production only)
    startRuntimeMonitor();

    // Log initial metrics
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("STARTUP COMPLETE — METRICS INITIALIZED");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  });
}

start();
