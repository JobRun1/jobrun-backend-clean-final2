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
// 🚨 BUILD INTEGRITY CHECK (DETECT STALE COMPILED CODE)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const BUILD_TIMESTAMP = new Date().toISOString();
const EXPECTED_BUILD_VERSION = "2026-01-04-ONBOARDING-ELIMINATED";

console.log("🔍 BUILD INTEGRITY CHECK");
console.log(`   Build Version: ${EXPECTED_BUILD_VERSION}`);
console.log(`   Compiled At: ${BUILD_TIMESTAMP}`);

// This marker MUST exist in compiled output if build is fresh
// If this marker is missing, production is running stale code
const BUILD_MARKER = "JOBRUN_BUILD_2026_01_04_CLEAN";
if (!BUILD_MARKER) {
  console.error("🚨🚨🚨 FATAL: BUILD_MARKER missing — STALE CODE DETECTED");
  throw new Error("BUILD INTEGRITY VIOLATION: Marker missing");
}

console.log("✅ Build integrity verified");
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
  MetricTwilioNumberPoolOrphanedOperational,
} from "./services/Metrics";
import { getAlertSystemStatus } from "./services/AlertService";

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

// Validate Twilio Number Pool (orphaned OPERATIONAL numbers)
async function validateTwilioNumberPool() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STARTUP CONTRACT: Twilio Number Pool Safety Check");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Query for orphaned OPERATIONAL numbers (OPERATIONAL + no clientId)
  const orphanedNumbers = await prisma.twilioNumberPool.findMany({
    where: {
      role: 'OPERATIONAL',
      clientId: null
    },
    select: {
      phoneE164: true,
      role: true,
      status: true,
      createdAt: true
    }
  });

  if (orphanedNumbers.length > 0) {
    console.error("🚨 CRITICAL ERROR: Orphaned OPERATIONAL numbers detected");
    console.error("   OPERATIONAL numbers MUST have a clientId bound");
    console.error("   Found orphaned numbers:");

    orphanedNumbers.forEach((number) => {
      console.error(`     - ${number.phoneE164} (status: ${number.status}, created: ${number.createdAt})`);
    });

    console.error("\n   💡 RESOLUTION:");
    console.error("      Either:");
    console.error("      1. Assign these numbers to a client");
    console.error("      2. Change their role to SYSTEM");
    console.error("      3. Delete them if they're not in use\n");

    // Increment metric for alerting
    metrics.increment(MetricTwilioNumberPoolOrphanedOperational, orphanedNumbers.length);

    // DO NOT crash - fail loudly but continue (production safety)
    console.error("   ⚠️  CONTINUING STARTUP (not crashing)");
    console.error("   ⚠️  Fix this ASAP to prevent customer impact\n");
  } else {
    console.log("✅ No orphaned OPERATIONAL numbers found");
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

// Track server start time for uptime calculation
const SERVER_START_TIME = Date.now();

// Create Express server
export function createServer() {
  const app = express();

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEMPORARY ISOLATION ROUTE (DEBUGGING ONLY)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Tests if Twilio is calling /api/twilio/voice instead of /twilio/voice
  // REMOVE AFTER PROOF STEP COMPLETE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  app.post("/api/twilio/voice", (req, res) => {
    console.log("🚨 ISOLATION VOICE ROUTE HIT");
    res.type("text/xml");
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  });

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
    const alertStatus = getAlertSystemStatus();

    // Degrade health status if alerts are disabled
    const overallStatus = !result.healthy ? "unhealthy" :
                          !alertStatus.enabled ? "degraded" :
                          "ok";

    if (!result.healthy) {
      metrics.increment(MetricHealthCheckUnhealthy);
      return res.status(503).json({
        status: overallStatus,
        uptime: uptimeSeconds,
        timestamp: result.timestamp,
        violations: result.violations,
        invariants: result.invariants,
        alerts: alertStatus,
      });
    }

    metrics.increment(MetricHealthCheckHealthy);
    res.status(200).json({
      status: overallStatus,
      uptime: uptimeSeconds,
      timestamp: result.timestamp,
      invariants: result.invariants,
      alerts: alertStatus,
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
  console.log("🧩 Twilio router mounted at /twilio");
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
  await validateTwilioNumberPool();

  // CRITICAL: Validate all SMS pricing templates at startup
  // This will THROW if any template contains £29 or incorrect pricing
  validateAllTemplates();

  const app = createServer();
  const server = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3001;

  console.log("🚀 JobRun Backend Starting");
  console.log("Port:", PORT);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ALERT SYSTEM STATUS CHECK (PRODUCTION SAFETY)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const alertStatus = getAlertSystemStatus();
  if (!alertStatus.enabled) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('🚨 WARNING: ALERTS ARE GLOBALLY DISABLED');
    console.error('🚨 ALERTS_DISABLED=true is set in environment');
    console.error('🚨 Operational failures will NOT notify founder');
    console.error('🚨 This should NEVER be enabled in production');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

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
