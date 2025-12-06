"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTwilioSignature = validateTwilioSignature;
exports.twilioValidationMiddleware = twilioValidationMiddleware;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Validate Twilio webhook signature
 * This ensures the request actually came from Twilio
 */
function validateTwilioSignature(req, authToken) {
    try {
        const twilioSignature = req.headers['x-twilio-signature'];
        if (!twilioSignature) {
            console.warn('No Twilio signature header found');
            return false;
        }
        // Build the full URL
        const protocol = req.protocol;
        const host = req.get('host');
        const url = `${protocol}://${host}${req.originalUrl}`;
        // Compute expected signature
        const data = Object.keys(req.body)
            .sort()
            .reduce((acc, key) => acc + key + req.body[key], url);
        const expectedSignature = crypto_1.default
            .createHmac('sha1', authToken)
            .update(Buffer.from(data, 'utf-8'))
            .digest('base64');
        return twilioSignature === expectedSignature;
    }
    catch (error) {
        console.error('Error validating Twilio signature:', error);
        return false;
    }
}
/**
 * Middleware wrapper for Twilio signature validation
 * Automatically bypasses validation in development, enforces in production
 */
function twilioValidationMiddleware(authToken) {
    return (req, res, next) => {
        const isDev = process.env.NODE_ENV !== 'production';
        // Skip validation in development
        if (isDev) {
            console.warn('⚠️  Skipping Twilio signature validation in development');
            return next();
        }
        // In production, perform actual signature validation
        const isValid = validateTwilioSignature(req, authToken);
        if (!isValid) {
            console.error('Invalid Twilio signature');
            return res.status(403).json({ error: 'Invalid signature' });
        }
        next();
    };
}
//# sourceMappingURL=validateTwilioRequest.js.map