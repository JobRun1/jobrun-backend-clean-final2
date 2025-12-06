/**
 * WebSocket Gateway
 * Phase 13: Real-time event broadcasting for JobRun
 */
import { Server as HTTPServer } from "http";
export type WebSocketEventType = "NEW_MESSAGE" | "NEW_HANDOVER" | "HANDOVER_RESOLVED" | "BOOKING_CREATED" | "BOOKING_UPDATED" | "AVAILABILITY_UPDATED";
export interface WebSocketEvent {
    type: WebSocketEventType;
    data: any;
    timestamp: Date;
}
export declare class WebSocketGateway {
    private static wss;
    private static connections;
    /**
     * Initialize WebSocket server
     */
    static initialize(httpServer: HTTPServer): void;
    /**
     * Remove a connection from the map
     */
    private static removeConnection;
    /**
     * Send event to a specific WebSocket connection
     */
    private static sendToConnection;
    /**
     * Broadcast event to all connections of a specific client
     */
    static broadcastToClient(clientId: string, type: WebSocketEventType, data: any): void;
    /**
     * Broadcast event to all connected clients
     */
    static broadcastGlobal(type: WebSocketEventType, data: any): void;
    /**
     * Get connection statistics
     */
    static getStats(): {
        totalClients: number;
        totalConnections: number;
    };
    /**
     * Close all connections
     */
    static close(): void;
}
//# sourceMappingURL=WebSocketGateway.d.ts.map