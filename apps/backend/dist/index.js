"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
// 🔒 Load dotenv ONLY when NOT running on Railway
// Railway sets RAILWAY_ENVIRONMENT=production automatically
if (process.env.RAILWAY_ENVIRONMENT !== "production") {
    console.log("📦 Loading local .env file…");
    require("dotenv").config();
}
else {
    console.log("🚀 Running in Railway — skipping dotenv");
}
const twilio_1 = __importDefault(require("./routes/twilio"));
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
    }
    else {
        console.log("✅ All required environment variables present");
    }
}
function createServer() {
    const app = (0, express_1.default)();
    // 🔍 Debug logging middleware (BEFORE body parsers)
    app.use((req, res, next) => {
        if (req.path.startsWith("/twilio")) {
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
            console.log("Raw Headers:", req.headers);
        }
        next();
    });
    // Body parsers (correct order for Twilio)
    app.use(express_1.default.urlencoded({ extended: true }));
    app.use(express_1.default.json());
    app.use((0, cors_1.default)());
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
    app.use("/twilio", twilio_1.default);
    return app;
}
const http_1 = __importDefault(require("http"));
async function start() {
    // Validate environment before starting
    validateEnv();
    const app = createServer();
    const server = http_1.default.createServer(app);
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
//# sourceMappingURL=index.js.map