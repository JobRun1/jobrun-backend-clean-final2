"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const twilio_1 = __importDefault(require("twilio"));
// Validate Twilio credentials
if (!process.env.TWILIO_ACCOUNT_SID) {
    console.error("❌ TWILIO_ACCOUNT_SID is not set");
}
if (!process.env.TWILIO_AUTH_TOKEN) {
    console.error("❌ TWILIO_AUTH_TOKEN is not set");
}
const twilioClient = (0, twilio_1.default)(process.env.TWILIO_ACCOUNT_SID || "MISSING_ACCOUNT_SID", process.env.TWILIO_AUTH_TOKEN || "MISSING_AUTH_TOKEN");
exports.default = twilioClient;
//# sourceMappingURL=twilio.js.map