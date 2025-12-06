"use strict";
/**
 * AISimulator - Local Testing Harness for AI Scheduling Engine
 * Simulates customer conversations without Twilio integration
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AISimulator = void 0;
const uuid_1 = require("uuid");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class AISimulator {
    conversationId;
    clientId;
    customerName;
    customerPhone;
    baseUrl;
    verbose;
    startTime;
    transcript;
    constructor(clientId, name, phone, options = {}) {
        this.conversationId = (0, uuid_1.v4)();
        this.clientId = clientId;
        this.customerName = name;
        this.customerPhone = phone;
        this.baseUrl = options.baseUrl || 'http://localhost:3001';
        this.verbose = options.verbose ?? true;
        this.startTime = Date.now();
        this.transcript = [];
        if (this.verbose) {
            console.log('═══════════════════════════════════════════════════');
            console.log('AI SCHEDULING SIMULATOR - NEW CONVERSATION');
            console.log('═══════════════════════════════════════════════════');
            console.log(`Conversation ID: ${this.conversationId}`);
            console.log(`Client ID: ${this.clientId}`);
            console.log(`Customer: ${this.customerName} (${this.customerPhone})`);
            console.log('═══════════════════════════════════════════════════\n');
        }
    }
    /**
     * Send a message to the AI scheduling engine
     */
    async send(message) {
        const turnStart = Date.now();
        const elapsedSinceStart = turnStart - this.startTime;
        if (this.verbose) {
            console.log(`\x1b[90m[${this.formatElapsed(elapsedSinceStart)}]\x1b[0m \x1b[36mUser:\x1b[0m ${message}`);
        }
        try {
            const response = await fetch(`${this.baseUrl}/api/ai/scheduling`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message,
                    conversationId: this.conversationId,
                    clientId: this.clientId,
                    customerName: this.customerName,
                    customerPhone: this.customerPhone,
                }),
            });
            const result = (await response.json());
            const turnEnd = Date.now();
            const turnDuration = turnEnd - turnStart;
            if (!response.ok) {
                if (this.verbose) {
                    console.log(`\x1b[31m✖ Error:\x1b[0m ${result.error?.message || 'Unknown error'}\n`);
                }
                this.transcript.push({
                    timestamp: new Date(turnStart),
                    elapsedMs: elapsedSinceStart,
                    userMessage: message,
                    aiReply: `ERROR: ${result.error?.message || 'Unknown error'}`,
                    bookingCreated: false,
                });
                return result;
            }
            if (result.success && result.data) {
                if (this.verbose) {
                    console.log(`\x1b[90m[${this.formatElapsed(turnDuration)}]\x1b[0m \x1b[32mAI:\x1b[0m ${result.data.reply}`);
                    if (result.data.proposedSlot) {
                        const slotDate = new Date(result.data.proposedSlot);
                        console.log(`\x1b[33m   → Proposed slot:\x1b[0m ${this.formatDateTime(slotDate)}`);
                    }
                    if (result.data.bookingCreated && result.data.bookingId) {
                        console.log(`\x1b[32m   ✓ BOOKING CONFIRMED:\x1b[0m ${result.data.bookingId}`);
                    }
                    console.log('');
                }
                this.transcript.push({
                    timestamp: new Date(turnStart),
                    elapsedMs: elapsedSinceStart,
                    userMessage: message,
                    aiReply: result.data.reply,
                    proposedSlot: result.data.proposedSlot || undefined,
                    bookingCreated: result.data.bookingCreated,
                    bookingId: result.data.bookingId,
                });
            }
            return result;
        }
        catch (error) {
            if (this.verbose) {
                console.error(`\x1b[31m✖ Network error:\x1b[0m ${error}\n`);
            }
            this.transcript.push({
                timestamp: new Date(turnStart),
                elapsedMs: elapsedSinceStart,
                userMessage: message,
                aiReply: `NETWORK ERROR: ${error}`,
                bookingCreated: false,
            });
            throw error;
        }
    }
    /**
     * Send multiple messages in sequence with optional repeat
     */
    async sendSequence(messages, repeatCount = 1) {
        const results = [];
        let bookingCreated = false;
        for (let repeat = 0; repeat < repeatCount; repeat++) {
            if (repeatCount > 1 && this.verbose) {
                console.log(`\n\x1b[35m━━━ REPEAT ${repeat + 1}/${repeatCount} ━━━\x1b[0m\n`);
            }
            for (const message of messages) {
                const result = await this.send(message);
                results.push(result);
                if (result.success && result.data?.bookingCreated) {
                    bookingCreated = true;
                }
                await this.delay(500);
            }
            // Reset conversation for next repeat (except on last iteration)
            if (repeat < repeatCount - 1) {
                this.reset();
            }
        }
        const totalElapsed = Date.now() - this.startTime;
        return {
            passed: bookingCreated,
            bookingCreated,
            totalMessages: messages.length * repeatCount,
            totalElapsedMs: totalElapsed,
            transcript: this.transcript,
        };
    }
    /**
     * Get database state - fetch bookings for this customer
     */
    async getDatabaseState() {
        try {
            // Use direct Prisma query if available, otherwise mock
            const response = await fetch(`${this.baseUrl}/api/bookings?phone=${encodeURIComponent(this.customerPhone)}`);
            if (response.ok) {
                return await response.json();
            }
            return { bookings: [] };
        }
        catch (error) {
            return { bookings: [], error: String(error) };
        }
    }
    /**
     * Print database snapshot after test
     */
    async printDatabaseSnapshot() {
        if (!this.verbose)
            return;
        console.log('\n═══════════════════════════════════════════════════');
        console.log('DATABASE SNAPSHOT');
        console.log('═══════════════════════════════════════════════════');
        const dbState = await this.getDatabaseState();
        if (dbState.bookings && dbState.bookings.length > 0) {
            console.log(`\x1b[32m✓ Found ${dbState.bookings.length} booking(s) for ${this.customerPhone}:\x1b[0m\n`);
            dbState.bookings.forEach((booking, index) => {
                console.log(`${index + 1}. ${booking.id}`);
                console.log(`   Start: ${new Date(booking.start).toLocaleString()}`);
                console.log(`   Status: ${booking.status}`);
                console.log(`   Customer: ${booking.customerName || 'N/A'}`);
                console.log('');
            });
        }
        else {
            console.log('\x1b[33m⚠ No bookings found for this customer\x1b[0m\n');
        }
        console.log('═══════════════════════════════════════════════════\n');
    }
    /**
     * Export conversation transcript to file
     */
    async exportTranscript(outputPath) {
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const filename = outputPath || path.join(process.cwd(), 'apps', 'backend', 'src', 'testing', 'transcripts', `transcript-${timestamp}.txt`);
        // Ensure directory exists
        const dir = path.dirname(filename);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        let content = '';
        content += '═══════════════════════════════════════════════════\n';
        content += 'AI SCHEDULING ENGINE - CONVERSATION TRANSCRIPT\n';
        content += '═══════════════════════════════════════════════════\n\n';
        content += `Conversation ID: ${this.conversationId}\n`;
        content += `Client ID: ${this.clientId}\n`;
        content += `Customer: ${this.customerName} (${this.customerPhone})\n`;
        content += `Date: ${new Date().toLocaleString()}\n`;
        content += `Total Messages: ${this.transcript.length}\n\n`;
        content += '═══════════════════════════════════════════════════\n';
        content += 'CONVERSATION\n';
        content += '═══════════════════════════════════════════════════\n\n';
        this.transcript.forEach((turn, index) => {
            content += `[${this.formatElapsed(turn.elapsedMs)}] Turn ${index + 1}\n`;
            content += `User: ${turn.userMessage}\n`;
            content += `AI: ${turn.aiReply}\n`;
            if (turn.proposedSlot) {
                content += `→ Proposed slot: ${new Date(turn.proposedSlot).toLocaleString()}\n`;
            }
            if (turn.bookingCreated && turn.bookingId) {
                content += `✓ BOOKING CONFIRMED: ${turn.bookingId}\n`;
            }
            content += '\n';
        });
        content += '═══════════════════════════════════════════════════\n';
        content += 'END OF TRANSCRIPT\n';
        content += '═══════════════════════════════════════════════════\n';
        fs.writeFileSync(filename, content, 'utf-8');
        if (this.verbose) {
            console.log(`\x1b[36m📄 Transcript saved to:\x1b[0m ${filename}\n`);
        }
        return filename;
    }
    /**
     * Get conversation transcript
     */
    getTranscript() {
        return this.transcript;
    }
    /**
     * Format elapsed time
     */
    formatElapsed(ms) {
        if (ms < 1000) {
            return `${ms}ms`;
        }
        else if (ms < 60000) {
            return `${(ms / 1000).toFixed(1)}s`;
        }
        else {
            const minutes = Math.floor(ms / 60000);
            const seconds = ((ms % 60000) / 1000).toFixed(0);
            return `${minutes}m ${seconds}s`;
        }
    }
    /**
     * Format date/time for display
     */
    formatDateTime(date) {
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        };
        return date.toLocaleString('en-US', options);
    }
    /**
     * Delay helper for sequential messages
     */
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Get current conversation ID
     */
    getConversationId() {
        return this.conversationId;
    }
    /**
     * Reset to new conversation
     */
    reset() {
        this.conversationId = (0, uuid_1.v4)();
        this.startTime = Date.now();
        this.transcript = [];
        if (this.verbose) {
            console.log('\n═══════════════════════════════════════════════════');
            console.log('CONVERSATION RESET');
            console.log('═══════════════════════════════════════════════════');
            console.log(`New Conversation ID: ${this.conversationId}\n`);
        }
    }
}
exports.AISimulator = AISimulator;
//# sourceMappingURL=AISimulator.js.map