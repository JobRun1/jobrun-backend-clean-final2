"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z
        .enum(['development', 'production', 'test'])
        .default('development'),
    PORT: zod_1.z
        .string()
        .optional()
        .default(process.env.PORT || '3001')
        .transform((val) => parseInt(val, 10)),
    DATABASE_URL: zod_1.z
        .string()
        .min(1, 'DATABASE_URL is required'),
    JWT_SECRET: zod_1.z
        .string()
        .min(32, 'JWT_SECRET must be at least 32 characters'),
    CORS_ORIGIN: zod_1.z
        .string()
        .optional(),
    TWILIO_ACCOUNT_SID: zod_1.z.string().optional(),
    TWILIO_AUTH_TOKEN: zod_1.z.string().optional(),
    TWILIO_PHONE_NUMBER: zod_1.z.string().optional(),
    OPENAI_API_KEY: zod_1.z.string().optional(),
    REDIS_URL: zod_1.z.string().optional(),
});
const parseEnv = () => {
    try {
        return envSchema.parse(process.env);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            console.error('❌ Environment validation failed:');
            error.errors.forEach((err) => {
                console.error(`  - ${err.path.join('.')}: ${err.message}`);
            });
            process.exit(1);
        }
        throw error;
    }
};
exports.env = parseEnv();
//# sourceMappingURL=index.js.map