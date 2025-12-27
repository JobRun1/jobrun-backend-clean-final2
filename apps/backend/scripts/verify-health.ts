/**
 * VERIFY HEALTH ENDPOINT
 *
 * Validates that the /health endpoint is responding correctly and
 * all startup invariants are passing.
 *
 * Purpose:
 * - Quick smoke test after starting the backend
 * - Confirms server is listening and healthy
 * - Can be used in CI/CD pipelines (exits non-zero on failure)
 * - Validates response structure and HTTP status codes
 *
 * Usage:
 *   # Start backend first in another terminal:
 *   npm run dev
 *
 *   # Then run this script:
 *   npx ts-node scripts/verify-health.ts
 *
 * Exit codes:
 *   0 - PASS: /health returns 200 OK with valid response
 *   1 - FAIL: /health unreachable, returns 503, or invalid response
 */

import http from "http";

const PORT = Number(process.env.PORT) || 3001;
const HEALTH_URL = `http://localhost:${PORT}/health`;

interface HealthResponse {
  status: string;
  uptime: number;
  timestamp: string;
  invariants: {
    defaultClientExists: boolean;
    clientSettingsExists: boolean;
    bookingUrlValid: boolean;
    envClientIdMatches: boolean;
  };
  violations?: Array<{
    invariant: string;
    expected: string;
    actual: string;
    severity: string;
  }>;
}

async function fetchHealth(): Promise<{
  statusCode: number;
  data: HealthResponse;
}> {
  return new Promise((resolve, reject) => {
    const req = http.get(HEALTH_URL, (res) => {
      let body = "";

      res.on("data", (chunk) => {
        body += chunk;
      });

      res.on("end", () => {
        try {
          const data = JSON.parse(body) as HealthResponse;
          resolve({
            statusCode: res.statusCode || 0,
            data,
          });
        } catch (error) {
          reject(new Error(`Failed to parse JSON response: ${error}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(
        new Error(
          `Failed to connect to ${HEALTH_URL}: ${error.message}\n` +
            `Is the backend running? Try: npm run dev`
        )
      );
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error(`Request timeout after 5 seconds`));
    });
  });
}

async function verifyHealth(): Promise<void> {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔍 VERIFY HEALTH ENDPOINT");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log(`Fetching: ${HEALTH_URL}`);
  console.log("");

  let response: { statusCode: number; data: HealthResponse };

  try {
    response = await fetchHealth();
  } catch (error) {
    console.error("❌ FAIL: Cannot reach /health endpoint");
    console.error("");
    console.error(
      "Error:",
      error instanceof Error ? error.message : String(error)
    );
    console.error("");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    process.exit(1);
  }

  const { statusCode, data } = response;

  console.log("Response received:");
  console.log(`  HTTP Status: ${statusCode}`);
  console.log(`  Status: ${data.status}`);
  console.log(`  Uptime: ${data.uptime.toFixed(2)}s`);
  console.log(`  Timestamp: ${data.timestamp}`);
  console.log("");

  console.log("Invariants:");
  console.log(
    `  DEFAULT_CLIENT_EXISTS: ${data.invariants.defaultClientExists ? "✅" : "❌"}`
  );
  console.log(
    `  CLIENT_SETTINGS_EXISTS: ${data.invariants.clientSettingsExists ? "✅" : "❌"}`
  );
  console.log(
    `  BOOKING_URL_VALID: ${data.invariants.bookingUrlValid ? "✅" : "❌"}`
  );
  console.log(
    `  ENV_CLIENT_ID_MATCHES: ${data.invariants.envClientIdMatches ? "✅" : "❌"}`
  );
  console.log("");

  // Check for violations
  if (data.violations && data.violations.length > 0) {
    console.error("⚠️  VIOLATIONS DETECTED:");
    console.error("");
    data.violations.forEach((v, i) => {
      console.error(`[${i + 1}] ${v.invariant} (${v.severity})`);
      console.error(`    Expected: ${v.expected}`);
      console.error(`    Actual:   ${v.actual}`);
      console.error("");
    });
  }

  // Validate response
  const isHealthy = statusCode === 200 && data.status === "ok";

  if (!isHealthy) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ FAIL");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("");

    if (statusCode === 503) {
      console.error(
        "The server is responding but startup invariants are failing."
      );
      console.error("Check the violations above and fix the issues.");
      console.error("");
      console.error("Common fixes:");
      console.error("  1. Run: npx ts-node scripts/bootstrap-default-client.ts");
      console.error("  2. Verify DEFAULT_CLIENT_ID in .env matches database");
      console.error("  3. Check database connection");
    } else {
      console.error(`Unexpected HTTP status: ${statusCode} (expected 200)`);
      console.error(`Response status: "${data.status}" (expected "ok")`);
    }

    console.error("");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    process.exit(1);
  }

  // All checks passed
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ PASS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("The /health endpoint is responding correctly.");
  console.log("All startup invariants are passing.");
  console.log("The backend is ready to serve traffic.");
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  process.exit(0);
}

verifyHealth();
