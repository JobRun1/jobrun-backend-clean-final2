import request from "supertest";
import { createServer } from "../index";

describe("Twilio Webhook Endpoints", () => {
  let app: any;

  beforeAll(() => {
    app = createServer();
  });

  describe("POST /api/twilio/voice", () => {
    it("should return valid TwiML for OPERATIONAL number", async () => {
      const response = await request(app)
        .post("/api/twilio/voice")
        .send({
          To: "+447414148956", // FastFix number
          From: "+1234567890",
          CallSid: "test-call-sid",
        })
        .expect(200)
        .expect("Content-Type", /xml/);

      expect(response.text).toContain("<Response>");
      expect(response.text).toContain("<Say");
      expect(response.text).not.toContain("🚨 VOICE ROUTE HIT (via /api prefix)");
    });

    it("should have access to req.body", async () => {
      const response = await request(app)
        .post("/api/twilio/voice")
        .send({
          To: "+447414148956",
          From: "+1234567890",
        })
        .expect(200);

      // If body parsing works, we'll get proper TwiML, not an error
      expect(response.text).toContain("<Response>");
    });

    it("should return valid TwiML for unknown numbers", async () => {
      const response = await request(app)
        .post("/api/twilio/voice")
        .send({
          To: "+19999999999",
          From: "+1234567890",
        })
        .expect(200)
        .expect("Content-Type", /xml/);

      expect(response.text).toContain("<Response>");
    });
  });

  describe("POST /api/twilio/sms", () => {
    it("should return valid TwiML", async () => {
      const response = await request(app)
        .post("/api/twilio/sms")
        .send({
          To: "+447414148956",
          From: "+1234567890",
          Body: "Test message",
        })
        .expect(200)
        .expect("Content-Type", /xml/);

      expect(response.text).toContain("<Response>");
    });
  });

  describe("POST /api/twilio/status", () => {
    it("should accept status callbacks", async () => {
      const response = await request(app)
        .post("/api/twilio/status")
        .send({
          CallSid: "test-call-sid",
          CallStatus: "completed",
        })
        .expect(200);
    });
  });

  describe("Routing Sanity Checks", () => {
    it("should NOT have isolation route", async () => {
      // If isolation route exists, it would return empty TwiML
      const response = await request(app)
        .post("/api/twilio/voice")
        .send({ To: "+447414148956", From: "+1234567890" });

      // Real route returns substantial TwiML
      expect(response.text.length).toBeGreaterThan(100);
    });

    it("should mount routes at /api/twilio, not /twilio", async () => {
      // /twilio/voice should 404
      await request(app)
        .post("/twilio/voice")
        .send({ To: "+447414148956", From: "+1234567890" })
        .expect(404);

      // /api/twilio/voice should work
      await request(app)
        .post("/api/twilio/voice")
        .send({ To: "+447414148956", From: "+1234567890" })
        .expect(200);
    });
  });
});
