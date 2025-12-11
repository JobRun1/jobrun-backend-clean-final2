import { Router } from "express";
import {
  processOnboardingMessage,
  startOnboarding,
  OnboardingMessage,
} from "../services/onboard";

const router = Router();

/**
 * POST /onboard/start
 * Start a new onboarding conversation
 */
router.post("/start", async (req, res) => {
  try {
    const response = await startOnboarding();

    res.json({
      success: true,
      message: response.message,
      isComplete: response.isComplete,
      config: response.config,
    });
  } catch (error) {
    console.error("❌ Onboarding start error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to start onboarding",
    });
  }
});

/**
 * POST /onboard/message
 * Process an onboarding message
 *
 * Body:
 * {
 *   "message": "user message",
 *   "history": [{ "role": "user", "content": "..." }, ...]
 * }
 */
router.post("/message", async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        error: "Message is required",
      });
    }

    const conversationHistory: OnboardingMessage[] = history || [];

    const response = await processOnboardingMessage(conversationHistory, message);

    res.json({
      success: true,
      message: response.message,
      isComplete: response.isComplete,
      config: response.config,
    });
  } catch (error) {
    console.error("❌ Onboarding message error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process message",
    });
  }
});

export default router;
