"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
function createServer() {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use((0, cors_1.default)());
    app.get("/", (_, res) => {
        res.json({
            message: "JobRun backend API is running",
            health: "/api/health",
            version: "/api/version"
        });
    });
    app.get("/api/health", (_, res) => {
        res.json({
            success: true,
            data: { status: "ok", timestamp: new Date().toISOString() }
        });
    });
    app.get("/api/version", (_, res) => {
        res.json({
            success: true,
            data: { name: "jobrun", version: "1.0.0" }
        });
    });
    return app;
}
//# sourceMappingURL=server.js.map