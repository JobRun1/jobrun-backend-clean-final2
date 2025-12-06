/**
 * WebSocket Gateway
 * Phase 13: Real-time event broadcasting for JobRun
 */

import { Server as HTTPServer } from "http"
import { WebSocketServer, WebSocket } from "ws"
import { IncomingMessage } from "http"

export type WebSocketEventType =
  | "NEW_MESSAGE"
  | "NEW_HANDOVER"
  | "HANDOVER_RESOLVED"
  | "BOOKING_CREATED"
  | "BOOKING_UPDATED"
  | "AVAILABILITY_UPDATED"

export interface WebSocketEvent {
  type: WebSocketEventType
  data: any
  timestamp: Date
}

interface ClientConnection {
  ws: WebSocket
  clientId: string
  connectedAt: Date
}

export class WebSocketGateway {
  private static wss: WebSocketServer | null = null
  private static connections: Map<string, ClientConnection[]> = new Map()

  /**
   * Initialize WebSocket server
   */
  static initialize(httpServer: HTTPServer): void {
    this.wss = new WebSocketServer({ server: httpServer })

    this.wss.on("connection", (ws: WebSocket, request: IncomingMessage) => {
      console.log("[WebSocket] New connection attempt")

      // Extract clientId from query params or headers
      const url = new URL(request.url || "", `http://${request.headers.host}`)
      const clientId = url.searchParams.get("clientId")

      if (!clientId) {
        console.log("[WebSocket] Rejected: No clientId provided")
        ws.close(1008, "clientId required")
        return
      }

      // Store connection
      const connection: ClientConnection = {
        ws,
        clientId,
        connectedAt: new Date(),
      }

      if (!this.connections.has(clientId)) {
        this.connections.set(clientId, [])
      }
      this.connections.get(clientId)!.push(connection)

      console.log(`[WebSocket] Client connected: ${clientId} (${this.connections.get(clientId)!.length} connections)`)

      // Send welcome message
      this.sendToConnection(ws, {
        type: "NEW_MESSAGE" as WebSocketEventType,
        data: { message: "Connected to JobRun WebSocket" },
        timestamp: new Date(),
      })

      // Handle disconnection
      ws.on("close", () => {
        this.removeConnection(clientId, ws)
        console.log(`[WebSocket] Client disconnected: ${clientId}`)
      })

      // Handle errors
      ws.on("error", (error: Error) => {
        console.error(`[WebSocket] Error for client ${clientId}:`, error)
        this.removeConnection(clientId, ws)
      })

      // Handle incoming messages (optional - for future bidirectional communication)
      ws.on("message", (data: any) => {
        try {
          const message = JSON.parse(data.toString())
          console.log(`[WebSocket] Received from ${clientId}:`, message)
          // Handle incoming messages here if needed
        } catch (error) {
          console.error("[WebSocket] Failed to parse message:", error)
        }
      })
    })

    console.log("[WebSocket] Gateway initialized")
  }

  /**
   * Remove a connection from the map
   */
  private static removeConnection(clientId: string, ws: WebSocket): void {
    const connections = this.connections.get(clientId)
    if (connections) {
      const filtered = connections.filter((conn) => conn.ws !== ws)
      if (filtered.length === 0) {
        this.connections.delete(clientId)
      } else {
        this.connections.set(clientId, filtered)
      }
    }
  }

  /**
   * Send event to a specific WebSocket connection
   */
  private static sendToConnection(ws: WebSocket, event: WebSocketEvent): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event))
    }
  }

  /**
   * Broadcast event to all connections of a specific client
   */
  static broadcastToClient(clientId: string, type: WebSocketEventType, data: any): void {
    const connections = this.connections.get(clientId)
    if (!connections || connections.length === 0) {
      console.log(`[WebSocket] No connections for client ${clientId}`)
      return
    }

    const event: WebSocketEvent = {
      type,
      data,
      timestamp: new Date(),
    }

    let sentCount = 0
    connections.forEach((connection) => {
      if (connection.ws.readyState === WebSocket.OPEN) {
        this.sendToConnection(connection.ws, event)
        sentCount++
      }
    })

    console.log(`[WebSocket] Broadcasted ${type} to ${sentCount} connection(s) for client ${clientId}`)
  }

  /**
   * Broadcast event to all connected clients
   */
  static broadcastGlobal(type: WebSocketEventType, data: any): void {
    const event: WebSocketEvent = {
      type,
      data,
      timestamp: new Date(),
    }

    let sentCount = 0
    this.connections.forEach((connections, clientId) => {
      connections.forEach((connection) => {
        if (connection.ws.readyState === WebSocket.OPEN) {
          this.sendToConnection(connection.ws, event)
          sentCount++
        }
      })
    })

    console.log(`[WebSocket] Broadcasted ${type} globally to ${sentCount} connection(s)`)
  }

  /**
   * Get connection statistics
   */
  static getStats(): { totalClients: number; totalConnections: number } {
    let totalConnections = 0
    this.connections.forEach((connections) => {
      totalConnections += connections.length
    })

    return {
      totalClients: this.connections.size,
      totalConnections,
    }
  }

  /**
   * Close all connections
   */
  static close(): void {
    this.connections.forEach((connections) => {
      connections.forEach((connection) => {
        connection.ws.close()
      })
    })
    this.connections.clear()

    if (this.wss) {
      this.wss.close()
      this.wss = null
    }

    console.log("[WebSocket] Gateway closed")
  }
}
