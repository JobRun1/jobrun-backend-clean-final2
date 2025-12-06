/**
 * ConversationMemory - Track Conversation State
 * PHASE 10: Added loop detection and 24-hour auto-reset
 * Saves:
 * - Last proposed slot
 * - Extracted customer preferences
 * - Previous questions asked
 * - Conversation context
 * - Last interaction timestamp
 * - Recent messages for loop detection
 */

export interface ConversationState {
  conversationId: string;
  lastProposedSlot?: Date;
  preferredDate?: Date;
  preferredTimeWindow?: string;
  customerName?: string;
  serviceType?: string;
  urgency?: 'low' | 'medium' | 'high';
  previousQuestions: string[];
  declinedSlots: Date[];
  createdAt: Date;
  updatedAt: Date;
  lastInteraction: number; // PHASE 10: timestamp for 24h reset
  recentMessages: string[]; // PHASE 10: for loop detection
  loopCount: number; // PHASE 10: consecutive ambiguous replies
  declineCount: number; // PHASE 11A: track declined slots
  contradictionCount: number; // PHASE 11A: track contradictions
  allMessages: Array<{ text: string; sender: 'customer' | 'ai' | 'human'; timestamp: Date }>; // PHASE 11A: full message history
  silenced: boolean; // PHASE 11A: AI silenced during handover
}

export class ConversationMemory {
  private static memory: Map<string, ConversationState> = new Map();
  private static readonly MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly RECENT_MESSAGE_LIMIT = 5; // Keep last 5 messages for loop detection

  /**
   * Get conversation state
   */
  static get(conversationId: string): ConversationState | null {
    return this.memory.get(conversationId) || null;
  }

  /**
   * Initialize new conversation
   */
  static init(conversationId: string): ConversationState {
    const now = Date.now();
    const state: ConversationState = {
      conversationId,
      previousQuestions: [],
      declinedSlots: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      lastInteraction: now,
      recentMessages: [],
      loopCount: 0,
      declineCount: 0,
      contradictionCount: 0,
      allMessages: [],
      silenced: false,
    };

    this.memory.set(conversationId, state);
    return state;
  }

  /**
   * Get or create conversation state
   * PHASE 10: Auto-reset if 24 hours elapsed
   */
  static getOrCreate(conversationId: string): ConversationState {
    const existing = this.get(conversationId);

    if (existing) {
      // Check if 24 hours have passed
      const now = Date.now();
      const age = now - existing.lastInteraction;

      if (age > this.MAX_AGE_MS) {
        // Auto-reset after 24 hours
        this.clear(conversationId);
        return this.init(conversationId);
      }

      return existing;
    }

    return this.init(conversationId);
  }

  /**
   * PHASE 10: Touch conversation (update last interaction timestamp)
   */
  static touch(conversationId: string): void {
    const state = this.getOrCreate(conversationId);
    state.lastInteraction = Date.now();
    state.updatedAt = new Date();
    this.memory.set(conversationId, state);
  }

  /**
   * PHASE 10: Check if memory needs reset (24 hours elapsed)
   */
  static needsReset(conversationId: string): boolean {
    const state = this.get(conversationId);
    if (!state) return false;

    const now = Date.now();
    const age = now - state.lastInteraction;

    return age > this.MAX_AGE_MS;
  }

  /**
   * PHASE 10: Reset conversation state (called when 24h expired)
   */
  static reset(conversationId: string): ConversationState {
    this.clear(conversationId);
    return this.init(conversationId);
  }

  /**
   * Update conversation state
   */
  static update(conversationId: string, updates: Partial<ConversationState>): ConversationState {
    const state = this.getOrCreate(conversationId);

    const updated = {
      ...state,
      ...updates,
      updatedAt: new Date(),
      lastInteraction: Date.now(),
    };

    this.memory.set(conversationId, updated);
    return updated;
  }

  /**
   * Record a proposed slot
   */
  static proposeSlot(conversationId: string, slot: Date): ConversationState {
    return this.update(conversationId, {
      lastProposedSlot: slot,
    });
  }

  /**
   * Record a declined slot
   */
  static declineSlot(conversationId: string, slot: Date): ConversationState {
    const state = this.getOrCreate(conversationId);

    return this.update(conversationId, {
      declinedSlots: [...state.declinedSlots, slot],
    });
  }

  /**
   * Record a question asked
   */
  static askQuestion(conversationId: string, question: string): ConversationState {
    const state = this.getOrCreate(conversationId);

    return this.update(conversationId, {
      previousQuestions: [...state.previousQuestions, question],
    });
  }

  /**
   * Set customer preferences
   */
  static setPreferences(
    conversationId: string,
    preferences: {
      preferredDate?: Date;
      preferredTimeWindow?: string;
      customerName?: string;
      serviceType?: string;
      urgency?: 'low' | 'medium' | 'high';
    }
  ): ConversationState {
    return this.update(conversationId, preferences);
  }

  /**
   * PHASE 10: Record message for loop detection
   */
  static recordMessage(conversationId: string, message: string): void {
    const state = this.getOrCreate(conversationId);

    const recentMessages = [...state.recentMessages, message.toLowerCase().trim()];

    // Keep only last N messages
    if (recentMessages.length > this.RECENT_MESSAGE_LIMIT) {
      recentMessages.shift();
    }

    state.recentMessages = recentMessages;
    this.memory.set(conversationId, state);
  }

  /**
   * PHASE 10: Detect conversation loop
   * Returns true if user is stuck in a loop
   */
  static detectLoop(conversationId: string, message: string): boolean {
    const state = this.getOrCreate(conversationId);
    const normalized = message.toLowerCase().trim();

    // Record this message
    this.recordMessage(conversationId, message);

    // Check for repeated exact messages
    const exactRepeats = state.recentMessages.filter((msg) => msg === normalized).length;
    if (exactRepeats >= 2) {
      state.loopCount++;
      return true;
    }

    // Check for repeated "ok" or "yes" without substance
    const ambiguousPatterns = ['ok', 'yes', 'yeah', 'yep', 'sure', '???', '??'];
    const isAmbiguous = ambiguousPatterns.some((pattern) => normalized === pattern);

    if (isAmbiguous) {
      state.loopCount++;

      // Trigger loop if 2+ consecutive ambiguous replies
      if (state.loopCount >= 2) {
        return true;
      }
    } else {
      // Reset loop count if user provides substance
      if (normalized.length > 10) {
        state.loopCount = 0;
      }
    }

    // Check for emoji-only messages with no content
    const emojiOnlyRegex = /^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\s]+$/u;
    if (emojiOnlyRegex.test(normalized)) {
      state.loopCount++;
      if (state.loopCount >= 2) {
        return true;
      }
    }

    return false;
  }

  /**
   * PHASE 10: Check if hard loop reset needed (4+ ambiguous in a row)
   */
  static needsHardReset(conversationId: string): boolean {
    const state = this.get(conversationId);
    return state ? state.loopCount >= 4 : false;
  }

  /**
   * PHASE 10: Reset loop counter
   */
  static resetLoopCount(conversationId: string): void {
    const state = this.get(conversationId);
    if (state) {
      state.loopCount = 0;
      this.memory.set(conversationId, state);
    }
  }

  /**
   * Clear conversation state
   */
  static clear(conversationId: string): void {
    this.memory.delete(conversationId);
  }

  /**
   * Check if we've already asked a specific question
   */
  static hasAskedQuestion(conversationId: string, questionType: string): boolean {
    const state = this.get(conversationId);
    if (!state) return false;

    return state.previousQuestions.some((q) => q.includes(questionType));
  }

  /**
   * Get declined slot count
   */
  static getDeclinedSlotCount(conversationId: string): number {
    const state = this.get(conversationId);
    return state?.declinedSlots.length || 0;
  }

  /**
   * Clean up old conversations (older than 24 hours)
   */
  static cleanup(): void {
    const now = Date.now();

    for (const [id, state] of this.memory.entries()) {
      const age = now - state.lastInteraction;
      if (age > this.MAX_AGE_MS) {
        this.memory.delete(id);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 11A: HANDOVER TRACKING METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Track decline count
   */
  static trackDecline(conversationId: string): void {
    const state = this.getOrCreate(conversationId);
    state.declineCount++;
    this.memory.set(conversationId, state);
  }

  /**
   * Get decline count
   */
  static getDeclineCount(conversationId: string): number {
    const state = this.get(conversationId);
    return state?.declineCount || 0;
  }

  /**
   * Track ambiguous reply
   */
  static trackAmbiguousReply(conversationId: string): void {
    const state = this.getOrCreate(conversationId);
    state.loopCount++;
    this.memory.set(conversationId, state);
  }

  /**
   * Track contradiction
   */
  static trackContradiction(conversationId: string): void {
    const state = this.getOrCreate(conversationId);
    state.contradictionCount++;
    this.memory.set(conversationId, state);
  }

  /**
   * Get contradiction count
   */
  static getContradictionCount(conversationId: string): number {
    const state = this.get(conversationId);
    return state?.contradictionCount || 0;
  }

  /**
   * Get loop count
   */
  static getLoopCount(conversationId: string): number {
    const state = this.get(conversationId);
    return state?.loopCount || 0;
  }

  /**
   * Add message to conversation history
   */
  static addMessage(
    conversationId: string,
    text: string,
    sender: 'customer' | 'ai' | 'human'
  ): void {
    const state = this.getOrCreate(conversationId);
    state.allMessages.push({
      text,
      sender,
      timestamp: new Date(),
    });
    this.memory.set(conversationId, state);
  }

  /**
   * Get last N messages
   */
  static getLastNMessages(conversationId: string, count: number = 10): string[] {
    const state = this.get(conversationId);
    if (!state) return [];

    const messages = state.allMessages.slice(-count);
    return messages.map((m) => `[${m.sender}] ${m.text}`);
  }

  /**
   * Get urgency score (1-10)
   */
  static getUrgencyScore(conversationId: string): number {
    const state = this.get(conversationId);
    if (!state) return 1;

    let score = 1;

    // Add points based on various factors
    if (state.urgency === 'high') score += 3;
    if (state.urgency === 'medium') score += 2;
    if (state.declineCount >= 3) score += 2;
    if (state.loopCount >= 3) score += 2;
    if (state.contradictionCount >= 2) score += 1;

    return Math.min(score, 10);
  }

  /**
   * Check if customer is VIP
   */
  static isVIPCustomer(conversationId: string): boolean {
    // TODO: Implement VIP check based on customer data
    // For now, return false
    return false;
  }

  /**
   * Mark conversation as silenced (AI won't respond)
   */
  static markSilencedForHandover(conversationId: string): void {
    const state = this.getOrCreate(conversationId);
    state.silenced = true;
    this.memory.set(conversationId, state);
  }

  /**
   * Un-silence conversation (re-enable AI)
   */
  static unsilence(conversationId: string): void {
    const state = this.get(conversationId);
    if (state) {
      state.silenced = false;
      this.memory.set(conversationId, state);
    }
  }

  /**
   * Check if conversation is silenced
   */
  static isSilenced(conversationId: string): boolean {
    const state = this.get(conversationId);
    return state?.silenced || false;
  }

  /**
   * Get conversation preferences
   */
  static getPreferences(conversationId: string): Partial<ConversationState> {
    const state = this.get(conversationId);
    if (!state) return {};

    return {
      preferredDate: state.preferredDate,
      preferredTimeWindow: state.preferredTimeWindow,
      customerName: state.customerName,
      serviceType: state.serviceType,
      urgency: state.urgency,
    };
  }
}

// Run cleanup every hour
setInterval(() => {
  ConversationMemory.cleanup();
}, 60 * 60 * 1000);
