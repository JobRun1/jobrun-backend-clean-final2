import express from "express";
import cors from "cors";

export function createServer() {
  const app = express();

  app.use(express.json());
  app.use(cors());

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
