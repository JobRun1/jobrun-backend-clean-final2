import type { UserRole } from '@prisma/client';
/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: ApiError;
    timestamp: string;
}
/**
 * API error structure
 */
export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}
/**
 * User DTO
 */
export interface UserDTO {
    id: string;
    email: string;
    role: UserRole;
    clientId: string | null;
    createdAt: string;
    updatedAt: string;
}
/**
 * Client DTO
 */
export interface ClientDTO {
    id: string;
    businessName: string;
    region: string;
    phoneNumber: string | null;
    createdAt: string;
    updatedAt: string;
}
/**
 * Login request
 */
export interface LoginRequest {
    email: string;
    password: string;
}
/**
 * Login response
 */
export interface LoginResponse {
    token: string;
    user: UserDTO;
}
/**
 * Health check response
 */
export interface HealthResponse {
    status: 'ok' | 'error';
    timestamp: string;
    database?: 'connected' | 'disconnected';
}
/**
 * Version response
 */
export interface VersionResponse {
    version: string;
    name: string;
}
//# sourceMappingURL=types.d.ts.map