"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const env_1 = require("../env");
const response_1 = require("../utils/response");
const constants_1 = require("../utils/constants");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * POST /api/auth/login
 * User login with email and password
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validate input
        if (!email || !password) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.VALIDATION_ERROR, 'Email and password are required', constants_1.HTTP_STATUS.BAD_REQUEST);
            return;
        }
        // Find user by email
        const user = await db_1.prisma.user.findUnique({
            where: { email },
            include: {
                client: true,
            },
        });
        if (!user) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.UNAUTHORIZED, 'Invalid email or password', constants_1.HTTP_STATUS.UNAUTHORIZED);
            return;
        }
        // Verify password
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!isValidPassword) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.UNAUTHORIZED, 'Invalid email or password', constants_1.HTTP_STATUS.UNAUTHORIZED);
            return;
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({
            sub: user.id,
            id: user.id,
            email: user.email,
            role: user.role,
            clientId: user.clientId,
        }, env_1.env.JWT_SECRET, { expiresIn: '7d' });
        // Send response
        (0, response_1.sendSuccess)(res, {
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                clientId: user.clientId,
                client: user.client ? {
                    id: user.client.id,
                    businessName: user.client.businessName,
                } : null,
            },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, 'Login failed', constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
/**
 * POST /api/auth/logout
 * User logout (client-side token removal)
 */
router.post('/logout', auth_1.authenticate, (req, res) => {
    // Logout is handled client-side by removing the token
    // This endpoint exists for consistency and future server-side session management
    (0, response_1.sendSuccess)(res, { message: 'Logged out successfully' });
});
/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', auth_1.authenticate, async (req, res) => {
    try {
        if (!req.user) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.UNAUTHORIZED, 'Not authenticated', constants_1.HTTP_STATUS.UNAUTHORIZED);
            return;
        }
        // Fetch user with client data
        const user = await db_1.prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                client: true,
            },
        });
        if (!user) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.NOT_FOUND, 'User not found', constants_1.HTTP_STATUS.NOT_FOUND);
            return;
        }
        (0, response_1.sendSuccess)(res, {
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                clientId: user.clientId,
                client: user.client ? {
                    id: user.client.id,
                    businessName: user.client.businessName,
                    region: user.client.region,
                    phoneNumber: user.client.phoneNumber,
                    timezone: user.client.timezone,
                    demoToolsVisible: user.client.demoToolsVisible,
                } : null,
            },
        });
    }
    catch (error) {
        console.error('Get user error:', error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, 'Failed to get user', constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
/**
 * POST /api/auth/register
 * Register a new user (admin use only or open registration)
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password, role = 'CLIENT', clientId } = req.body;
        // Validate input
        if (!email || !password) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.VALIDATION_ERROR, 'Email and password are required', constants_1.HTTP_STATUS.BAD_REQUEST);
            return;
        }
        // Check if user already exists
        const existingUser = await db_1.prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            (0, response_1.sendError)(res, constants_1.ERROR_CODES.CONFLICT, 'User with this email already exists', constants_1.HTTP_STATUS.CONFLICT);
            return;
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Create user
        const user = await db_1.prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role,
                clientId,
            },
            include: {
                client: true,
            },
        });
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({
            sub: user.id,
            id: user.id,
            email: user.email,
            role: user.role,
            clientId: user.clientId,
        }, env_1.env.JWT_SECRET, { expiresIn: '7d' });
        (0, response_1.sendSuccess)(res, {
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                clientId: user.clientId,
                client: user.client ? {
                    id: user.client.id,
                    businessName: user.client.businessName,
                } : null,
            },
        }, constants_1.HTTP_STATUS.CREATED);
    }
    catch (error) {
        console.error('Registration error:', error);
        (0, response_1.sendError)(res, constants_1.ERROR_CODES.INTERNAL_ERROR, 'Registration failed', constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map