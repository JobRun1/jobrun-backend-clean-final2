"use strict";
/**
 * WebSocket Gateway
 * Phase 13: Real-time event broadcasting for JobRun
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketGateway = void 0;
const ws_1 = require("ws");
class WebSocketGateway {
    static wss = null;
    static connections = new Map();
    /**
     * Initialize WebSocket server
     */
    static initialize(httpServer) {
        this.wss = new ws_1.WebSocketServer({ server: httpServer });
        this.wss.on("connection", (ws, request) => {
            console.log("[WebSocket] New connection attempt");
            // Extract clientId from query params or headers
            const url = new URL(request.url || "", `http://${request.headers.host}`);
            const clientId = url.searchParams.get("clientId");
            if (!clientId) {
                console.log("[WebSocket] Rejected: No clientId provided");
                ws.close(1008, "clientId required");
                return;
            }
            // Store connection
            const connection = {
                ws,
                clientId,
                connectedAt: new Date(),
            };
            if (!this.connections.has(clientId)) {
                this.connections.set(clientId, []);
            }
            this.connections.get(clientId).push(connection);
            console.log(`[WebSocket] Client connected: ${clientId} (${this.connections.get(clientId).length} connections)`);
            // Send welcome message
            this.sendToConnection(ws, {
                type: "NEW_MESSAGE",
                data: { message: "Connected to JobRun WebSocket" },
                timestamp: new Date(),
            });
            // Handle disconnection
            ws.on("close", () => {
                this.removeConnection(clientId, ws);
                console.log(`[WebSocket] Client disconnected: ${clientId}`);
            });
            // Handle errors
            ws.on("error", (error) => {
                console.error(`[WebSocket] Error for client ${clientId}:`, error);
                this.removeConnection(clientId, ws);
            });
            // Handle incoming messages (optional - for future bidirectional communication)
            ws.on("message", (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    console.log(`[WebSocket] Received from ${clientId}:`, message);
                    // Handle incoming messages here if needed
                }
                catch (error) {
                    console.error("[WebSocket] Failed to parse message:", error);
                }
            });
        });
        console.log("[WebSocket] Gateway initialized");
    }
    /**
     * Remove a connection from the map
     */
    static removeConnection(clientId, ws) {
        const connections = this.connections.get(clientId);
        if (connections) {
            const filtered = connections.filter((conn) => conn.ws !== ws);
            if (filtered.length === 0) {
                this.connections.delete(clientId);
            }
            else {
                this.connections.set(clientId, filtered);
            }
        }
    }
    /**
     * Send event to a specific WebSocket connection
     */
    static sendToConnection(ws, event) {
        if (ws.readyState === ws_1.WebSocket.OPEN) {
            ws.send(JSON.stringify(event));
        }
    }
    /**
     * Broadcast event to all connections of a specific client
     */
    static broadcastToClient(clientId, type, data) {
        const connections = this.connections.get(clientId);
        if (!connections || connections.length === 0) {
            console.log(`[WebSocket] No connections for client ${clientId}`);
            return;
        }
        const event = {
            type,
            data,
            timestamp: new Date(),
        };
        let sentCount = 0;
        connections.forEach((connection) => {
            if (connection.ws.readyState === ws_1.WebSocket.OPEN) {
                this.sendToConnection(connection.ws, event);
                sentCount++;
            }
        });
        console.log(`[WebSocket] Broadcasted ${type} to ${sentCount} connection(s) for client ${clientId}`);
    }
    /**
     * Broadcast event to all connected clients
     */
    static broadcastGlobal(type, data) {
        const event = {
            type,
            data,
            timestamp: new Date(),
        };
        let sentCount = 0;
        this.connections.forEach((connections, clientId) => {
            connections.forEach((connection) => {
                if (connection.ws.readyState === ws_1.WebSocket.OPEN) {
                    this.sendToConnection(connection.ws, event);
                    sentCount++;
                }
            });
        });
        console.log(`[WebSocket] Broadcasted ${type} globally to ${sentCount} connection(s)`);
    }
    /**
     * Get connection statistics
     */
    static getStats() {
        let totalConnections = 0;
        this.connections.forEach((connections) => {
            totalConnections += connections.length;
        });
        return {
            totalClients: this.connections.size,
            totalConnections,
        };
    }
    /**
     * Close all connections
     */
    static close() {
        this.connections.forEach((connections) => {
            connections.forEach((connection) => {
                connection.ws.close();
            });
        });
        this.connections.clear();
        if (this.wss) {
            this.wss.close();
            this.wss = null;
        }
        console.log("[WebSocket] Gateway closed");
    }
}
exports.WebSocketGateway = WebSocketGateway;
//# sourceMappingURL=WebSocketGateway.js.map