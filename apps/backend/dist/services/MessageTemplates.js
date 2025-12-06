"use strict";
/**
 * MessageTemplates - AI Response Templates
 * Tone: Professional, Polite, Efficient
 * PHASE 10: Hard-locked consistency structure
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageTemplates = void 0;
class MessageTemplates {
    /**
     * HARD-LOCKED: Offer a specific time slot
     * EXACT structure enforced
     */
    static offerSlot(slot) {
        const time = this.formatTime(slot);
        const date = this.formatDate(slot);
        return `The earliest I can offer is ${time} on ${date}. Does that work for you?`;
    }
    /**
     * HARD-LOCKED: Offer next earliest slot after declined
     * EXACT structure enforced
     */
    static nextSlot(slot) {
        const time = this.formatTime(slot);
        const date = this.formatDate(slot);
        return `No problem — the next available time is ${time} on ${date}. Does that work?`;
    }
    /**
     * HARD-LOCKED: Confirm booking
     * EXACT structure enforced
     */
    static confirmBooking(slot, customerName) {
        const time = this.formatTime(slot);
        const date = this.formatDate(slot);
        return `Perfect — I've booked you for ${time} on ${date}. See you then!`;
    }
    /**
     * HARD-LOCKED: Fallback for errors or unclear situations
     * EXACT structure enforced
     */
    static fallback() {
        return "I'm having trouble finding a suitable time — can you tell me the date you prefer?";
    }
    /**
     * PHASE 10: DIRECT & CONCISE clarification - date missing
     */
    static clarifyDate() {
        return 'What date works best for you?';
    }
    /**
     * PHASE 10: DIRECT & CONCISE clarification - time missing
     */
    static clarifyTime() {
        return 'What time works best for you?';
    }
    /**
     * PHASE 10: DIRECT & CONCISE clarification - time window ambiguous
     */
    static clarifyTimeWindow() {
        return 'Which time in that range works best for you?';
    }
    /**
     * PHASE 10: DIRECT & CONCISE clarification - general
     */
    static clarifyGeneral() {
        return 'To make sure I offer the right time, what date would you prefer?';
    }
    /**
     * PHASE 10: Loop detection - soft reset
     */
    static loopReset() {
        return 'No problem — what date would you prefer?';
    }
    /**
     * PHASE 10: Loop detection - hard reset
     */
    static loopHardReset() {
        return "Whenever you're ready, just tell me a date and I'll find the best available time.";
    }
    /**
     * PHASE 10: Memory reset (24-hour timeout)
     */
    static memoryReset() {
        return 'Welcome back — what date works best for you?';
    }
    /**
     * PHASE 11A: Handover escalated to human
     */
    static handoverEscalated() {
        return "Let me check this with the business owner and I'll get right back to you.";
    }
    /**
     * PHASE 11A: AI silenced during active handover
     */
    static handoverSilent() {
        return 'No problem — the business owner will respond directly from here.';
    }
    /**
     * PHASE 11A: Handover closed, AI back online
     */
    static handoverClosed() {
        return "All sorted — I'm here again if you need help booking anything.";
    }
    /**
     * Urgent slot offer
     */
    static urgentSlot(slot) {
        const time = this.formatTime(slot);
        const date = this.formatDate(slot);
        if (this.isToday(slot)) {
            return `I can fit you in today at ${time}. Does that work?`;
        }
        return `The earliest I can offer is ${time} on ${date}. Does that work for you?`;
    }
    /**
     * Ask for preferred date (legacy - prefer clarifyDate)
     */
    static askDate() {
        return this.clarifyDate();
    }
    /**
     * Ask for preferred time
     */
    static askTime(date) {
        return this.clarifyTime();
    }
    /**
     * Ask for general preference (legacy - prefer clarifyGeneral)
     */
    static askPreference() {
        return this.clarifyGeneral();
    }
    /**
     * Day is closed
     */
    static closedDay(requestedDate, nextOpenDay) {
        const requested = this.formatDate(requestedDate);
        const nextOpen = this.formatDate(nextOpenDay);
        const time = this.formatTime(nextOpenDay);
        return `We're closed ${requested} — but I can fit you in on ${nextOpen} at ${time}. Does that work?`;
    }
    /**
     * Day is fully booked
     */
    static fullyBooked(requestedDate, nextAvailable) {
        const requested = this.formatDate(requestedDate);
        const time = this.formatTime(nextAvailable);
        const date = this.formatDate(nextAvailable);
        return `We're fully booked ${requested} — but the next available time is ${time} on ${date}. Does that work?`;
    }
    /**
     * Message unclear - request clarification
     */
    static unclear() {
        return this.clarifyGeneral();
    }
    /**
     * No availability found
     */
    static noAvailability() {
        return "I'm sorry, we don't have any availability in the next few weeks. Please call us directly to discuss options.";
    }
    /**
     * Format time in 12-hour format
     */
    static formatTime(date) {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = minutes > 0 ? `:${minutes.toString().padStart(2, '0')}` : '';
        return `${displayHours}${displayMinutes} ${ampm}`;
    }
    /**
     * Format date in human-readable format
     */
    static formatDate(date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        if (targetDate.getTime() === today.getTime()) {
            return 'today';
        }
        if (targetDate.getTime() === tomorrow.getTime()) {
            return 'tomorrow';
        }
        // Within next 7 days - use day name
        const daysUntil = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil >= 0 && daysUntil < 7) {
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return dayNames[targetDate.getDay()];
        }
        // Otherwise use month + day
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[targetDate.getMonth()]} ${targetDate.getDate()}`;
    }
    /**
     * Check if date is today
     */
    static isToday(date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(date);
        target.setHours(0, 0, 0, 0);
        return target.getTime() === today.getTime();
    }
}
exports.MessageTemplates = MessageTemplates;
//# sourceMappingURL=MessageTemplates.js.map