"use strict";
/**
 * SchedulingBrain - Core AI Scheduling Logic
 * PHASE 10: Integrated safety, truthfulness, and guardrails
 * Orchestrates all AI modules to handle booking conversations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulingBrain = void 0;
const DateParser_1 = require("./DateParser");
const TimeParser_1 = require("./TimeParser");
const UrgencyClassifier_1 = require("./UrgencyClassifier");
const SlotFinder_1 = require("./SlotFinder");
const ConversationMemory_1 = require("./ConversationMemory");
const MessageTemplates_1 = require("./MessageTemplates");
const SafetyFilter_1 = require("./SafetyFilter");
const AdminLogger_1 = require("./AdminLogger");
const HandoverManager_1 = require("./HandoverManager");
const HandoverDetectionEngine_1 = require("./HandoverDetectionEngine");
const NotificationService_1 = require("./NotificationService");
class SchedulingBrain {
    /**
     * Main entry point - process incoming message and generate response
     * PHASE 10: Complete safety and truthfulness integration
     * PHASE 11A: Added handover detection and escalation
     */
    static async process(request) {
        const { message, conversationId, clientId, defaultDurationMinutes = 60 } = request;
        // ═══════════════════════════════════════════════════════════════
        // PHASE 11A: CHECK IF IN ACTIVE HANDOVER (FIRST - BEFORE ANYTHING)
        // ═══════════════════════════════════════════════════════════════
        const isInHandover = await HandoverManager_1.HandoverManager.isInHandover(conversationId);
        if (isInHandover) {
            AdminLogger_1.AdminLogger.log('ai_silenced_for_handover', conversationId, clientId, {
                message: message.substring(0, 100),
            });
            return {
                reply: MessageTemplates_1.MessageTemplates.handoverSilent(),
                proposedSlot: null,
                shouldBook: false,
            };
        }
        // ═══════════════════════════════════════════════════════════════
        // STEP 1: SAFETY CHECK (FIRST - ALWAYS)
        // ═══════════════════════════════════════════════════════════════
        const safetyCheck = SafetyFilter_1.SafetyFilter.check(message);
        if (!safetyCheck.safe) {
            AdminLogger_1.AdminLogger.log('unsafe_content', conversationId, clientId, {
                type: safetyCheck.type,
                message: message.substring(0, 100),
            });
            // PHASE 11A: Escalate unsafe content to human immediately
            await this.triggerHandover(conversationId, clientId, `Unsafe content detected: ${safetyCheck.type}`, 10, // Critical urgency
            ['unsafe_content', safetyCheck.type || 'unknown']);
            const deflectionMessage = SafetyFilter_1.SafetyFilter.getDeflectionMessage(safetyCheck.type);
            return {
                reply: deflectionMessage,
                proposedSlot: null,
                shouldBook: false,
            };
        }
        // ═══════════════════════════════════════════════════════════════
        // STEP 2: AUTO MEMORY RESET (24-HOUR CHECK)
        // ═══════════════════════════════════════════════════════════════
        if (ConversationMemory_1.ConversationMemory.needsReset(conversationId)) {
            ConversationMemory_1.ConversationMemory.reset(conversationId);
            AdminLogger_1.AdminLogger.log('memory_reset', conversationId, clientId, { reason: '24h_timeout' });
            return {
                reply: MessageTemplates_1.MessageTemplates.memoryReset(),
                proposedSlot: null,
                shouldBook: false,
            };
        }
        // Get or create conversation state
        const state = ConversationMemory_1.ConversationMemory.getOrCreate(conversationId);
        // ═══════════════════════════════════════════════════════════════
        // STEP 3: LOOP DETECTION
        // ═══════════════════════════════════════════════════════════════
        const isLoop = ConversationMemory_1.ConversationMemory.detectLoop(conversationId, message);
        if (isLoop) {
            AdminLogger_1.AdminLogger.log('loop_detected', conversationId, clientId, {
                loopCount: state.loopCount,
                message: message.substring(0, 100),
            });
            // Hard reset if 4+ consecutive ambiguous replies
            if (ConversationMemory_1.ConversationMemory.needsHardReset(conversationId)) {
                ConversationMemory_1.ConversationMemory.resetLoopCount(conversationId);
                return {
                    reply: MessageTemplates_1.MessageTemplates.loopHardReset(),
                    proposedSlot: null,
                    shouldBook: false,
                };
            }
            // Soft reset for 2-3 ambiguous replies
            return {
                reply: MessageTemplates_1.MessageTemplates.loopReset(),
                proposedSlot: null,
                shouldBook: false,
            };
        }
        // ═══════════════════════════════════════════════════════════════
        // STEP 4: UPDATE MEMORY
        // ═══════════════════════════════════════════════════════════════
        ConversationMemory_1.ConversationMemory.touch(conversationId);
        // ═══════════════════════════════════════════════════════════════
        // STEP 5: PARSE INTENT
        // ═══════════════════════════════════════════════════════════════
        const isUrgent = UrgencyClassifier_1.UrgencyClassifier.isUrgent(message);
        const preferredDate = DateParser_1.DateParser.parse(message);
        const timeWindow = TimeParser_1.TimeParser.parse(message);
        // Log parsed data
        if (preferredDate) {
            AdminLogger_1.AdminLogger.log('parsed_date', conversationId, clientId, { date: preferredDate });
        }
        if (timeWindow) {
            AdminLogger_1.AdminLogger.log('parsed_time', conversationId, clientId, { window: timeWindow });
        }
        if (isUrgent) {
            AdminLogger_1.AdminLogger.log('urgency_detected', conversationId, clientId, { message: message.substring(0, 100) });
        }
        // Update conversation memory
        if (preferredDate) {
            ConversationMemory_1.ConversationMemory.setPreferences(conversationId, { preferredDate });
        }
        if (timeWindow) {
            ConversationMemory_1.ConversationMemory.setPreferences(conversationId, {
                preferredTimeWindow: TimeParser_1.TimeParser.formatWindow(timeWindow),
            });
        }
        if (isUrgent) {
            ConversationMemory_1.ConversationMemory.setPreferences(conversationId, { urgency: 'high' });
        }
        // Store message in conversation history
        ConversationMemory_1.ConversationMemory.addMessage(conversationId, message, 'customer');
        // ═══════════════════════════════════════════════════════════════
        // PHASE 11A: HANDOVER DETECTION (AFTER PARSING, BEFORE CONTINUING)
        // ═══════════════════════════════════════════════════════════════
        const isVIP = ConversationMemory_1.ConversationMemory.isVIPCustomer(conversationId);
        const handoverCheck = HandoverDetectionEngine_1.HandoverDetectionEngine.detectHandover(message, conversationId, isVIP);
        if (handoverCheck.shouldEscalate) {
            await this.triggerHandover(conversationId, clientId, handoverCheck.reason || 'Escalation triggered', handoverCheck.urgencyScore, handoverCheck.triggers);
            return {
                reply: MessageTemplates_1.MessageTemplates.handoverEscalated(),
                proposedSlot: null,
                shouldBook: false,
            };
        }
        // ═══════════════════════════════════════════════════════════════
        // STEP 6: CHECK FOR CONFIRMATION
        // ═══════════════════════════════════════════════════════════════
        if (this.isConfirmation(message)) {
            if (state.lastProposedSlot) {
                const reply = MessageTemplates_1.MessageTemplates.confirmBooking(state.lastProposedSlot);
                AdminLogger_1.AdminLogger.log('booking_success', conversationId, clientId, {
                    slot: state.lastProposedSlot,
                });
                return {
                    reply,
                    proposedSlot: state.lastProposedSlot,
                    shouldBook: true,
                };
            }
        }
        // ═══════════════════════════════════════════════════════════════
        // STEP 7: CHECK FOR DECLINE
        // ═══════════════════════════════════════════════════════════════
        if (this.isDecline(message)) {
            if (state.lastProposedSlot) {
                ConversationMemory_1.ConversationMemory.declineSlot(conversationId, state.lastProposedSlot);
                try {
                    const nextSlot = await this.findNextSlot(clientId, state.lastProposedSlot, defaultDurationMinutes, preferredDate || undefined, timeWindow || undefined);
                    if (nextSlot) {
                        ConversationMemory_1.ConversationMemory.proposeSlot(conversationId, nextSlot);
                        AdminLogger_1.AdminLogger.log('slot_chosen', conversationId, clientId, { slot: nextSlot });
                        return {
                            reply: MessageTemplates_1.MessageTemplates.nextSlot(nextSlot),
                            proposedSlot: nextSlot,
                            shouldBook: false,
                        };
                    }
                    else {
                        AdminLogger_1.AdminLogger.log('fallback_triggered', conversationId, clientId, {
                            reason: 'no_next_slot',
                        });
                        return {
                            reply: MessageTemplates_1.MessageTemplates.noAvailability(),
                            proposedSlot: null,
                            shouldBook: false,
                        };
                    }
                }
                catch (error) {
                    AdminLogger_1.AdminLogger.log('error', conversationId, clientId, {
                        error: String(error),
                        context: 'findNextSlot',
                    });
                    return {
                        reply: MessageTemplates_1.MessageTemplates.fallback(),
                        proposedSlot: null,
                        shouldBook: false,
                    };
                }
            }
        }
        // ═══════════════════════════════════════════════════════════════
        // STEP 8: TRUTHFULNESS ENGINE - SMART-STRICT CLARIFICATION
        // ═══════════════════════════════════════════════════════════════
        // Check for ambiguous time window
        if (timeWindow && TimeParser_1.TimeParser.isTooBroad(timeWindow)) {
            AdminLogger_1.AdminLogger.log('clarification_needed', conversationId, clientId, {
                reason: 'time_window_too_broad',
            });
            return {
                reply: MessageTemplates_1.MessageTemplates.clarifyTimeWindow(),
                proposedSlot: null,
                shouldBook: false,
            };
        }
        // Check for vague time expressions
        if (TimeParser_1.TimeParser.isAmbiguous(message)) {
            AdminLogger_1.AdminLogger.log('clarification_needed', conversationId, clientId, {
                reason: 'ambiguous_time',
            });
            return {
                reply: MessageTemplates_1.MessageTemplates.clarifyTime(),
                proposedSlot: null,
                shouldBook: false,
            };
        }
        // Check if we need date clarification
        if (this.needsDateClarification(message, preferredDate, timeWindow, state)) {
            AdminLogger_1.AdminLogger.log('clarification_needed', conversationId, clientId, {
                reason: 'date_missing',
            });
            return {
                reply: MessageTemplates_1.MessageTemplates.clarifyDate(),
                proposedSlot: null,
                shouldBook: false,
            };
        }
        // ═══════════════════════════════════════════════════════════════
        // STEP 9: DETERMINE BEHAVIOR PATH
        // ═══════════════════════════════════════════════════════════════
        let pathChosen = 'unknown';
        try {
            if (isUrgent) {
                pathChosen = 'urgent';
                AdminLogger_1.AdminLogger.log('path_chosen', conversationId, clientId, { path: pathChosen });
                return await this.handleUrgentRequest(clientId, conversationId, defaultDurationMinutes);
            }
            if (preferredDate && !timeWindow) {
                pathChosen = 'date_only';
                AdminLogger_1.AdminLogger.log('path_chosen', conversationId, clientId, { path: pathChosen });
                return await this.handleDateOnly(clientId, conversationId, preferredDate, defaultDurationMinutes);
            }
            if (timeWindow && !preferredDate) {
                pathChosen = 'time_only';
                AdminLogger_1.AdminLogger.log('path_chosen', conversationId, clientId, { path: pathChosen });
                return await this.handleTimeOnly(clientId, conversationId, timeWindow, defaultDurationMinutes);
            }
            if (preferredDate && timeWindow) {
                pathChosen = 'date_and_time';
                AdminLogger_1.AdminLogger.log('path_chosen', conversationId, clientId, { path: pathChosen });
                return await this.handleDateAndTime(clientId, conversationId, preferredDate, timeWindow, defaultDurationMinutes);
            }
            // Vague/ambiguous - offer earliest or ask for preference
            if (!state.lastProposedSlot) {
                pathChosen = 'initial_request';
                AdminLogger_1.AdminLogger.log('path_chosen', conversationId, clientId, { path: pathChosen });
                return await this.handleInitialRequest(clientId, conversationId, defaultDurationMinutes);
            }
            // Default fallback
            pathChosen = 'fallback';
            AdminLogger_1.AdminLogger.log('path_chosen', conversationId, clientId, { path: pathChosen });
            return {
                reply: MessageTemplates_1.MessageTemplates.clarifyGeneral(),
                proposedSlot: null,
                shouldBook: false,
            };
        }
        catch (error) {
            AdminLogger_1.AdminLogger.log('error', conversationId, clientId, {
                error: String(error),
                path: pathChosen,
            });
            return {
                reply: MessageTemplates_1.MessageTemplates.fallback(),
                proposedSlot: null,
                shouldBook: false,
            };
        }
    }
    /**
     * PHASE 10: Check if date clarification is needed
     */
    static needsDateClarification(message, preferredDate, timeWindow, state) {
        // If we have time window but no date, need date
        if (timeWindow && !preferredDate && !state.preferredDate) {
            return true;
        }
        return false;
    }
    /**
     * Handle urgent requests (ASAP, today, emergency)
     */
    static async handleUrgentRequest(clientId, conversationId, durationMinutes) {
        try {
            const today = new Date();
            const slot = await SlotFinder_1.SlotFinder.findEarliestSlot({
                clientId,
                preferredDate: today,
                durationMinutes,
                searchDaysAhead: 1,
            });
            if (slot) {
                ConversationMemory_1.ConversationMemory.proposeSlot(conversationId, slot);
                AdminLogger_1.AdminLogger.log('slot_chosen', conversationId, clientId, { slot, urgency: 'high' });
                return {
                    reply: MessageTemplates_1.MessageTemplates.urgentSlot(slot),
                    proposedSlot: slot,
                    shouldBook: false,
                };
            }
            // Try tomorrow
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const nextSlot = await SlotFinder_1.SlotFinder.findEarliestSlot({
                clientId,
                preferredDate: tomorrow,
                durationMinutes,
                searchDaysAhead: 1,
            });
            if (nextSlot) {
                ConversationMemory_1.ConversationMemory.proposeSlot(conversationId, nextSlot);
                AdminLogger_1.AdminLogger.log('slot_chosen', conversationId, clientId, { slot: nextSlot, urgency: 'high' });
                return {
                    reply: MessageTemplates_1.MessageTemplates.urgentSlot(nextSlot),
                    proposedSlot: nextSlot,
                    shouldBook: false,
                };
            }
            return {
                reply: MessageTemplates_1.MessageTemplates.noAvailability(),
                proposedSlot: null,
                shouldBook: false,
            };
        }
        catch (error) {
            AdminLogger_1.AdminLogger.log('error', conversationId, clientId, {
                error: String(error),
                context: 'handleUrgentRequest',
            });
            return {
                reply: MessageTemplates_1.MessageTemplates.fallback(),
                proposedSlot: null,
                shouldBook: false,
            };
        }
    }
    /**
     * Handle date-only requests
     */
    static async handleDateOnly(clientId, conversationId, date, durationMinutes) {
        try {
            const isClosed = await SlotFinder_1.SlotFinder.isDayClosed(clientId, date);
            if (isClosed) {
                const nextOpenDay = await SlotFinder_1.SlotFinder.findNextOpenDay(clientId, date);
                if (nextOpenDay) {
                    const slot = await SlotFinder_1.SlotFinder.findEarliestSlot({
                        clientId,
                        preferredDate: nextOpenDay,
                        durationMinutes,
                        searchDaysAhead: 1,
                    });
                    if (slot) {
                        ConversationMemory_1.ConversationMemory.proposeSlot(conversationId, slot);
                        AdminLogger_1.AdminLogger.log('slot_chosen', conversationId, clientId, { slot, reason: 'closed_day' });
                        return {
                            reply: MessageTemplates_1.MessageTemplates.closedDay(date, slot),
                            proposedSlot: slot,
                            shouldBook: false,
                        };
                    }
                }
                return {
                    reply: MessageTemplates_1.MessageTemplates.noAvailability(),
                    proposedSlot: null,
                    shouldBook: false,
                };
            }
            const slot = await SlotFinder_1.SlotFinder.findEarliestSlot({
                clientId,
                preferredDate: date,
                durationMinutes,
                searchDaysAhead: 1,
            });
            if (slot) {
                ConversationMemory_1.ConversationMemory.proposeSlot(conversationId, slot);
                AdminLogger_1.AdminLogger.log('slot_chosen', conversationId, clientId, { slot });
                return {
                    reply: MessageTemplates_1.MessageTemplates.offerSlot(slot),
                    proposedSlot: slot,
                    shouldBook: false,
                };
            }
            // Day is fully booked
            const nextSlot = await this.findNextSlot(clientId, date, durationMinutes);
            if (nextSlot) {
                ConversationMemory_1.ConversationMemory.proposeSlot(conversationId, nextSlot);
                AdminLogger_1.AdminLogger.log('slot_chosen', conversationId, clientId, { slot: nextSlot, reason: 'fully_booked' });
                return {
                    reply: MessageTemplates_1.MessageTemplates.fullyBooked(date, nextSlot),
                    proposedSlot: nextSlot,
                    shouldBook: false,
                };
            }
            return {
                reply: MessageTemplates_1.MessageTemplates.noAvailability(),
                proposedSlot: null,
                shouldBook: false,
            };
        }
        catch (error) {
            AdminLogger_1.AdminLogger.log('error', conversationId, clientId, {
                error: String(error),
                context: 'handleDateOnly',
            });
            return {
                reply: MessageTemplates_1.MessageTemplates.fallback(),
                proposedSlot: null,
                shouldBook: false,
            };
        }
    }
    /**
     * Handle time-only requests (morning, afternoon, etc.)
     */
    static async handleTimeOnly(clientId, conversationId, timeWindow, durationMinutes) {
        // Ask for preferred date
        ConversationMemory_1.ConversationMemory.askQuestion(conversationId, 'date');
        return {
            reply: MessageTemplates_1.MessageTemplates.clarifyDate(),
            proposedSlot: null,
            shouldBook: false,
        };
    }
    /**
     * Handle date + time requests
     */
    static async handleDateAndTime(clientId, conversationId, date, timeWindow, durationMinutes) {
        try {
            const slot = await SlotFinder_1.SlotFinder.findEarliestSlot({
                clientId,
                preferredDate: date,
                timeWindow,
                durationMinutes,
                searchDaysAhead: 1,
            });
            if (slot) {
                ConversationMemory_1.ConversationMemory.proposeSlot(conversationId, slot);
                AdminLogger_1.AdminLogger.log('slot_chosen', conversationId, clientId, { slot });
                return {
                    reply: MessageTemplates_1.MessageTemplates.offerSlot(slot),
                    proposedSlot: slot,
                    shouldBook: false,
                };
            }
            // No slot in that window
            const nextSlot = await this.findNextSlot(clientId, date, durationMinutes);
            if (nextSlot) {
                ConversationMemory_1.ConversationMemory.proposeSlot(conversationId, nextSlot);
                AdminLogger_1.AdminLogger.log('slot_chosen', conversationId, clientId, {
                    slot: nextSlot,
                    reason: 'window_unavailable',
                });
                return {
                    reply: `I don't have availability in that time window, but ${MessageTemplates_1.MessageTemplates.nextSlot(nextSlot)}`,
                    proposedSlot: nextSlot,
                    shouldBook: false,
                };
            }
            return {
                reply: MessageTemplates_1.MessageTemplates.noAvailability(),
                proposedSlot: null,
                shouldBook: false,
            };
        }
        catch (error) {
            AdminLogger_1.AdminLogger.log('error', conversationId, clientId, {
                error: String(error),
                context: 'handleDateAndTime',
            });
            return {
                reply: MessageTemplates_1.MessageTemplates.fallback(),
                proposedSlot: null,
                shouldBook: false,
            };
        }
    }
    /**
     * Handle initial request with no specifics
     */
    static async handleInitialRequest(clientId, conversationId, durationMinutes) {
        try {
            const slot = await SlotFinder_1.SlotFinder.findEarliestSlot({
                clientId,
                durationMinutes,
                searchDaysAhead: 14,
            });
            if (slot) {
                ConversationMemory_1.ConversationMemory.proposeSlot(conversationId, slot);
                AdminLogger_1.AdminLogger.log('slot_chosen', conversationId, clientId, { slot, reason: 'initial_request' });
                return {
                    reply: MessageTemplates_1.MessageTemplates.offerSlot(slot),
                    proposedSlot: slot,
                    shouldBook: false,
                };
            }
            return {
                reply: MessageTemplates_1.MessageTemplates.noAvailability(),
                proposedSlot: null,
                shouldBook: false,
            };
        }
        catch (error) {
            AdminLogger_1.AdminLogger.log('error', conversationId, clientId, {
                error: String(error),
                context: 'handleInitialRequest',
            });
            return {
                reply: MessageTemplates_1.MessageTemplates.fallback(),
                proposedSlot: null,
                shouldBook: false,
            };
        }
    }
    /**
     * Find next available slot after a given date/time
     */
    static async findNextSlot(clientId, afterDate, durationMinutes, preferredDate, timeWindow) {
        const startDate = new Date(afterDate);
        startDate.setMinutes(startDate.getMinutes() + 15);
        return SlotFinder_1.SlotFinder.findEarliestSlot({
            clientId,
            preferredDate: preferredDate || startDate,
            timeWindow,
            durationMinutes,
            searchDaysAhead: 14,
        });
    }
    /**
     * Check if message is a confirmation
     */
    static isConfirmation(message) {
        const confirmationWords = [
            'yes',
            'yeah',
            'yep',
            'sure',
            'ok',
            'okay',
            'perfect',
            'great',
            'sounds good',
            'that works',
            'works for me',
            'confirm',
            'book it',
            'book me',
            "let's do it",
            'please',
        ];
        const normalized = message.toLowerCase().trim();
        return confirmationWords.some((word) => normalized.includes(word));
    }
    /**
     * Check if message is a decline/rejection
     */
    static isDecline(message) {
        const declineWords = [
            'no',
            'nope',
            'not',
            "can't",
            "won't",
            "doesn't work",
            'different',
            'another',
            'else',
            'later',
            'earlier',
        ];
        const normalized = message.toLowerCase().trim();
        return declineWords.some((word) => normalized.includes(word));
    }
    /**
     * PHASE 11A: Trigger handover to human
     */
    static async triggerHandover(conversationId, clientId, reason, urgencyScore, triggers) {
        try {
            // Start handover
            await HandoverManager_1.HandoverManager.startHandover({
                conversationId,
                clientId,
                reason,
                urgencyScore,
                triggers,
            });
            // Silence AI for this conversation
            ConversationMemory_1.ConversationMemory.markSilencedForHandover(conversationId);
            // Check if notification should be sent (throttle to prevent spam)
            const shouldNotify = await HandoverManager_1.HandoverManager.shouldNotify(conversationId);
            if (shouldNotify) {
                // Build notification payload
                const lastMessages = NotificationService_1.NotificationService.getLastMessages(conversationId, 10);
                const urgencyLevel = HandoverDetectionEngine_1.HandoverDetectionEngine.getUrgencyLevel(urgencyScore);
                const dashboardLink = NotificationService_1.NotificationService.buildDashboardLink(clientId, conversationId);
                const payload = {
                    conversationId,
                    lastMessages,
                    urgencyScore,
                    urgencyLevel,
                    reason,
                    triggers,
                    dashboardLink,
                };
                // Send notification
                const result = await NotificationService_1.NotificationService.sendHandoverNotification(clientId, payload);
                // Mark as notified if successful
                if (result.smsSent || result.emailSent) {
                    await HandoverManager_1.HandoverManager.markNotified(conversationId);
                    AdminLogger_1.AdminLogger.log('handover_notified', conversationId, clientId, {
                        smsSent: result.smsSent,
                        emailSent: result.emailSent,
                        urgencyScore,
                        reason,
                    });
                }
                else {
                    AdminLogger_1.AdminLogger.log('handover_suppressed', conversationId, clientId, {
                        reason: 'notification_failed',
                        errors: result.errors,
                    });
                }
            }
            else {
                AdminLogger_1.AdminLogger.log('handover_suppressed', conversationId, clientId, {
                    reason: 'throttled',
                    urgencyScore,
                });
            }
            // Log handover trigger
            AdminLogger_1.AdminLogger.log('handover_triggered', conversationId, clientId, {
                reason,
                urgencyScore,
                urgencyLevel: HandoverDetectionEngine_1.HandoverDetectionEngine.getUrgencyLevel(urgencyScore),
                triggers,
            });
        }
        catch (error) {
            AdminLogger_1.AdminLogger.log('error', conversationId, clientId, {
                error: String(error),
                context: 'triggerHandover',
            });
        }
    }
}
exports.SchedulingBrain = SchedulingBrain;
//# sourceMappingURL=SchedulingBrain.js.map