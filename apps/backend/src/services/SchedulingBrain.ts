/**
 * SchedulingBrain - Core AI Scheduling Logic
 * PHASE 10: Integrated safety, truthfulness, and guardrails
 * Orchestrates all AI modules to handle booking conversations
 */

import { DateParser } from './DateParser';
import { TimeParser, TimeWindow } from './TimeParser';
import { UrgencyClassifier } from './UrgencyClassifier';
import { SlotFinder } from './SlotFinder';
import { ConversationMemory } from './ConversationMemory';
import { MessageTemplates } from './MessageTemplates';
import { SafetyFilter } from './SafetyFilter';
import { AdminLogger } from './AdminLogger';
import { HandoverManager } from './HandoverManager';
import { HandoverDetectionEngine } from './HandoverDetectionEngine';
import { NotificationService } from './NotificationService';

export interface SchedulingRequest {
  message: string;
  conversationId: string;
  clientId: string;
  defaultDurationMinutes?: number;
}

export interface SchedulingResponse {
  reply: string;
  proposedSlot: Date | null;
  shouldBook: boolean;
}

export class SchedulingBrain {
  /**
   * Main entry point - process incoming message and generate response
   * PHASE 10: Complete safety and truthfulness integration
   * PHASE 11A: Added handover detection and escalation
   */
  static async process(request: SchedulingRequest): Promise<SchedulingResponse> {
    const { message, conversationId, clientId, defaultDurationMinutes = 60 } = request;

    // ═══════════════════════════════════════════════════════════════
    // PHASE 11A: CHECK IF IN ACTIVE HANDOVER (FIRST - BEFORE ANYTHING)
    // ═══════════════════════════════════════════════════════════════
    const isInHandover = await HandoverManager.isInHandover(conversationId);
    if (isInHandover) {
      AdminLogger.log('ai_silenced_for_handover', conversationId, clientId, {
        message: message.substring(0, 100),
      });

      return {
        reply: MessageTemplates.handoverSilent(),
        proposedSlot: null,
        shouldBook: false,
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 1: SAFETY CHECK (FIRST - ALWAYS)
    // ═══════════════════════════════════════════════════════════════
    const safetyCheck = SafetyFilter.check(message);
    if (!safetyCheck.safe) {
      AdminLogger.log('unsafe_content', conversationId, clientId, {
        type: safetyCheck.type,
        message: message.substring(0, 100),
      });

      // PHASE 11A: Escalate unsafe content to human immediately
      await this.triggerHandover(
        conversationId,
        clientId,
        `Unsafe content detected: ${safetyCheck.type}`,
        10, // Critical urgency
        ['unsafe_content', safetyCheck.type || 'unknown']
      );

      const deflectionMessage = SafetyFilter.getDeflectionMessage(safetyCheck.type!);
      return {
        reply: deflectionMessage,
        proposedSlot: null,
        shouldBook: false,
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: AUTO MEMORY RESET (24-HOUR CHECK)
    // ═══════════════════════════════════════════════════════════════
    if (ConversationMemory.needsReset(conversationId)) {
      ConversationMemory.reset(conversationId);
      AdminLogger.log('memory_reset', conversationId, clientId, { reason: '24h_timeout' });

      return {
        reply: MessageTemplates.memoryReset(),
        proposedSlot: null,
        shouldBook: false,
      };
    }

    // Get or create conversation state
    const state = ConversationMemory.getOrCreate(conversationId);

    // ═══════════════════════════════════════════════════════════════
    // STEP 3: LOOP DETECTION
    // ═══════════════════════════════════════════════════════════════
    const isLoop = ConversationMemory.detectLoop(conversationId, message);
    if (isLoop) {
      AdminLogger.log('loop_detected', conversationId, clientId, {
        loopCount: state.loopCount,
        message: message.substring(0, 100),
      });

      // Hard reset if 4+ consecutive ambiguous replies
      if (ConversationMemory.needsHardReset(conversationId)) {
        ConversationMemory.resetLoopCount(conversationId);
        return {
          reply: MessageTemplates.loopHardReset(),
          proposedSlot: null,
          shouldBook: false,
        };
      }

      // Soft reset for 2-3 ambiguous replies
      return {
        reply: MessageTemplates.loopReset(),
        proposedSlot: null,
        shouldBook: false,
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 4: UPDATE MEMORY
    // ═══════════════════════════════════════════════════════════════
    ConversationMemory.touch(conversationId);

    // ═══════════════════════════════════════════════════════════════
    // STEP 5: PARSE INTENT
    // ═══════════════════════════════════════════════════════════════
    const isUrgent = UrgencyClassifier.isUrgent(message);
    const preferredDate = DateParser.parse(message);
    const timeWindow = TimeParser.parse(message);

    // Log parsed data
    if (preferredDate) {
      AdminLogger.log('parsed_date', conversationId, clientId, { date: preferredDate });
    }
    if (timeWindow) {
      AdminLogger.log('parsed_time', conversationId, clientId, { window: timeWindow });
    }
    if (isUrgent) {
      AdminLogger.log('urgency_detected', conversationId, clientId, { message: message.substring(0, 100) });
    }

    // Update conversation memory
    if (preferredDate) {
      ConversationMemory.setPreferences(conversationId, { preferredDate });
    }
    if (timeWindow) {
      ConversationMemory.setPreferences(conversationId, {
        preferredTimeWindow: TimeParser.formatWindow(timeWindow),
      });
    }
    if (isUrgent) {
      ConversationMemory.setPreferences(conversationId, { urgency: 'high' });
    }

    // Store message in conversation history
    ConversationMemory.addMessage(conversationId, message, 'customer');

    // ═══════════════════════════════════════════════════════════════
    // PHASE 11A: HANDOVER DETECTION (AFTER PARSING, BEFORE CONTINUING)
    // ═══════════════════════════════════════════════════════════════
    const isVIP = ConversationMemory.isVIPCustomer(conversationId);
    const handoverCheck = HandoverDetectionEngine.detectHandover(message, conversationId, isVIP);

    if (handoverCheck.shouldEscalate) {
      await this.triggerHandover(
        conversationId,
        clientId,
        handoverCheck.reason || 'Escalation triggered',
        handoverCheck.urgencyScore,
        handoverCheck.triggers
      );

      return {
        reply: MessageTemplates.handoverEscalated(),
        proposedSlot: null,
        shouldBook: false,
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 6: CHECK FOR CONFIRMATION
    // ═══════════════════════════════════════════════════════════════
    if (this.isConfirmation(message)) {
      if (state.lastProposedSlot) {
        const reply = MessageTemplates.confirmBooking(state.lastProposedSlot);
        AdminLogger.log('booking_success', conversationId, clientId, {
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
        ConversationMemory.declineSlot(conversationId, state.lastProposedSlot);

        try {
          const nextSlot = await this.findNextSlot(
            clientId,
            state.lastProposedSlot,
            defaultDurationMinutes,
            preferredDate || undefined,
            timeWindow || undefined
          );

          if (nextSlot) {
            ConversationMemory.proposeSlot(conversationId, nextSlot);
            AdminLogger.log('slot_chosen', conversationId, clientId, { slot: nextSlot });

            return {
              reply: MessageTemplates.nextSlot(nextSlot),
              proposedSlot: nextSlot,
              shouldBook: false,
            };
          } else {
            AdminLogger.log('fallback_triggered', conversationId, clientId, {
              reason: 'no_next_slot',
            });

            return {
              reply: MessageTemplates.noAvailability(),
              proposedSlot: null,
              shouldBook: false,
            };
          }
        } catch (error) {
          AdminLogger.log('error', conversationId, clientId, {
            error: String(error),
            context: 'findNextSlot',
          });

          return {
            reply: MessageTemplates.fallback(),
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
    if (timeWindow && TimeParser.isTooBroad(timeWindow)) {
      AdminLogger.log('clarification_needed', conversationId, clientId, {
        reason: 'time_window_too_broad',
      });

      return {
        reply: MessageTemplates.clarifyTimeWindow(),
        proposedSlot: null,
        shouldBook: false,
      };
    }

    // Check for vague time expressions
    if (TimeParser.isAmbiguous(message)) {
      AdminLogger.log('clarification_needed', conversationId, clientId, {
        reason: 'ambiguous_time',
      });

      return {
        reply: MessageTemplates.clarifyTime(),
        proposedSlot: null,
        shouldBook: false,
      };
    }

    // Check if we need date clarification
    if (this.needsDateClarification(message, preferredDate, timeWindow, state)) {
      AdminLogger.log('clarification_needed', conversationId, clientId, {
        reason: 'date_missing',
      });

      return {
        reply: MessageTemplates.clarifyDate(),
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
        AdminLogger.log('path_chosen', conversationId, clientId, { path: pathChosen });
        return await this.handleUrgentRequest(clientId, conversationId, defaultDurationMinutes);
      }

      if (preferredDate && !timeWindow) {
        pathChosen = 'date_only';
        AdminLogger.log('path_chosen', conversationId, clientId, { path: pathChosen });
        return await this.handleDateOnly(clientId, conversationId, preferredDate, defaultDurationMinutes);
      }

      if (timeWindow && !preferredDate) {
        pathChosen = 'time_only';
        AdminLogger.log('path_chosen', conversationId, clientId, { path: pathChosen });
        return await this.handleTimeOnly(clientId, conversationId, timeWindow, defaultDurationMinutes);
      }

      if (preferredDate && timeWindow) {
        pathChosen = 'date_and_time';
        AdminLogger.log('path_chosen', conversationId, clientId, { path: pathChosen });
        return await this.handleDateAndTime(
          clientId,
          conversationId,
          preferredDate,
          timeWindow,
          defaultDurationMinutes
        );
      }

      // Vague/ambiguous - offer earliest or ask for preference
      if (!state.lastProposedSlot) {
        pathChosen = 'initial_request';
        AdminLogger.log('path_chosen', conversationId, clientId, { path: pathChosen });
        return await this.handleInitialRequest(clientId, conversationId, defaultDurationMinutes);
      }

      // Default fallback
      pathChosen = 'fallback';
      AdminLogger.log('path_chosen', conversationId, clientId, { path: pathChosen });

      return {
        reply: MessageTemplates.clarifyGeneral(),
        proposedSlot: null,
        shouldBook: false,
      };
    } catch (error) {
      AdminLogger.log('error', conversationId, clientId, {
        error: String(error),
        path: pathChosen,
      });

      return {
        reply: MessageTemplates.fallback(),
        proposedSlot: null,
        shouldBook: false,
      };
    }
  }

  /**
   * PHASE 10: Check if date clarification is needed
   */
  private static needsDateClarification(
    message: string,
    preferredDate: Date | null,
    timeWindow: TimeWindow | null,
    state: any
  ): boolean {
    // If we have time window but no date, need date
    if (timeWindow && !preferredDate && !state.preferredDate) {
      return true;
    }

    return false;
  }

  /**
   * Handle urgent requests (ASAP, today, emergency)
   */
  private static async handleUrgentRequest(
    clientId: string,
    conversationId: string,
    durationMinutes: number
  ): Promise<SchedulingResponse> {
    try {
      const today = new Date();

      const slot = await SlotFinder.findEarliestSlot({
        clientId,
        preferredDate: today,
        durationMinutes,
        searchDaysAhead: 1,
      });

      if (slot) {
        ConversationMemory.proposeSlot(conversationId, slot);
        AdminLogger.log('slot_chosen', conversationId, clientId, { slot, urgency: 'high' });

        return {
          reply: MessageTemplates.urgentSlot(slot),
          proposedSlot: slot,
          shouldBook: false,
        };
      }

      // Try tomorrow
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const nextSlot = await SlotFinder.findEarliestSlot({
        clientId,
        preferredDate: tomorrow,
        durationMinutes,
        searchDaysAhead: 1,
      });

      if (nextSlot) {
        ConversationMemory.proposeSlot(conversationId, nextSlot);
        AdminLogger.log('slot_chosen', conversationId, clientId, { slot: nextSlot, urgency: 'high' });

        return {
          reply: MessageTemplates.urgentSlot(nextSlot),
          proposedSlot: nextSlot,
          shouldBook: false,
        };
      }

      return {
        reply: MessageTemplates.noAvailability(),
        proposedSlot: null,
        shouldBook: false,
      };
    } catch (error) {
      AdminLogger.log('error', conversationId, clientId, {
        error: String(error),
        context: 'handleUrgentRequest',
      });

      return {
        reply: MessageTemplates.fallback(),
        proposedSlot: null,
        shouldBook: false,
      };
    }
  }

  /**
   * Handle date-only requests
   */
  private static async handleDateOnly(
    clientId: string,
    conversationId: string,
    date: Date,
    durationMinutes: number
  ): Promise<SchedulingResponse> {
    try {
      const isClosed = await SlotFinder.isDayClosed(clientId, date);

      if (isClosed) {
        const nextOpenDay = await SlotFinder.findNextOpenDay(clientId, date);

        if (nextOpenDay) {
          const slot = await SlotFinder.findEarliestSlot({
            clientId,
            preferredDate: nextOpenDay,
            durationMinutes,
            searchDaysAhead: 1,
          });

          if (slot) {
            ConversationMemory.proposeSlot(conversationId, slot);
            AdminLogger.log('slot_chosen', conversationId, clientId, { slot, reason: 'closed_day' });

            return {
              reply: MessageTemplates.closedDay(date, slot),
              proposedSlot: slot,
              shouldBook: false,
            };
          }
        }

        return {
          reply: MessageTemplates.noAvailability(),
          proposedSlot: null,
          shouldBook: false,
        };
      }

      const slot = await SlotFinder.findEarliestSlot({
        clientId,
        preferredDate: date,
        durationMinutes,
        searchDaysAhead: 1,
      });

      if (slot) {
        ConversationMemory.proposeSlot(conversationId, slot);
        AdminLogger.log('slot_chosen', conversationId, clientId, { slot });

        return {
          reply: MessageTemplates.offerSlot(slot),
          proposedSlot: slot,
          shouldBook: false,
        };
      }

      // Day is fully booked
      const nextSlot = await this.findNextSlot(clientId, date, durationMinutes);

      if (nextSlot) {
        ConversationMemory.proposeSlot(conversationId, nextSlot);
        AdminLogger.log('slot_chosen', conversationId, clientId, { slot: nextSlot, reason: 'fully_booked' });

        return {
          reply: MessageTemplates.fullyBooked(date, nextSlot),
          proposedSlot: nextSlot,
          shouldBook: false,
        };
      }

      return {
        reply: MessageTemplates.noAvailability(),
        proposedSlot: null,
        shouldBook: false,
      };
    } catch (error) {
      AdminLogger.log('error', conversationId, clientId, {
        error: String(error),
        context: 'handleDateOnly',
      });

      return {
        reply: MessageTemplates.fallback(),
        proposedSlot: null,
        shouldBook: false,
      };
    }
  }

  /**
   * Handle time-only requests (morning, afternoon, etc.)
   */
  private static async handleTimeOnly(
    clientId: string,
    conversationId: string,
    timeWindow: TimeWindow,
    durationMinutes: number
  ): Promise<SchedulingResponse> {
    // Ask for preferred date
    ConversationMemory.askQuestion(conversationId, 'date');

    return {
      reply: MessageTemplates.clarifyDate(),
      proposedSlot: null,
      shouldBook: false,
    };
  }

  /**
   * Handle date + time requests
   */
  private static async handleDateAndTime(
    clientId: string,
    conversationId: string,
    date: Date,
    timeWindow: TimeWindow,
    durationMinutes: number
  ): Promise<SchedulingResponse> {
    try {
      const slot = await SlotFinder.findEarliestSlot({
        clientId,
        preferredDate: date,
        timeWindow,
        durationMinutes,
        searchDaysAhead: 1,
      });

      if (slot) {
        ConversationMemory.proposeSlot(conversationId, slot);
        AdminLogger.log('slot_chosen', conversationId, clientId, { slot });

        return {
          reply: MessageTemplates.offerSlot(slot),
          proposedSlot: slot,
          shouldBook: false,
        };
      }

      // No slot in that window
      const nextSlot = await this.findNextSlot(clientId, date, durationMinutes);

      if (nextSlot) {
        ConversationMemory.proposeSlot(conversationId, nextSlot);
        AdminLogger.log('slot_chosen', conversationId, clientId, {
          slot: nextSlot,
          reason: 'window_unavailable',
        });

        return {
          reply: `I don't have availability in that time window, but ${MessageTemplates.nextSlot(nextSlot)}`,
          proposedSlot: nextSlot,
          shouldBook: false,
        };
      }

      return {
        reply: MessageTemplates.noAvailability(),
        proposedSlot: null,
        shouldBook: false,
      };
    } catch (error) {
      AdminLogger.log('error', conversationId, clientId, {
        error: String(error),
        context: 'handleDateAndTime',
      });

      return {
        reply: MessageTemplates.fallback(),
        proposedSlot: null,
        shouldBook: false,
      };
    }
  }

  /**
   * Handle initial request with no specifics
   */
  private static async handleInitialRequest(
    clientId: string,
    conversationId: string,
    durationMinutes: number
  ): Promise<SchedulingResponse> {
    try {
      const slot = await SlotFinder.findEarliestSlot({
        clientId,
        durationMinutes,
        searchDaysAhead: 14,
      });

      if (slot) {
        ConversationMemory.proposeSlot(conversationId, slot);
        AdminLogger.log('slot_chosen', conversationId, clientId, { slot, reason: 'initial_request' });

        return {
          reply: MessageTemplates.offerSlot(slot),
          proposedSlot: slot,
          shouldBook: false,
        };
      }

      return {
        reply: MessageTemplates.noAvailability(),
        proposedSlot: null,
        shouldBook: false,
      };
    } catch (error) {
      AdminLogger.log('error', conversationId, clientId, {
        error: String(error),
        context: 'handleInitialRequest',
      });

      return {
        reply: MessageTemplates.fallback(),
        proposedSlot: null,
        shouldBook: false,
      };
    }
  }

  /**
   * Find next available slot after a given date/time
   */
  private static async findNextSlot(
    clientId: string,
    afterDate: Date,
    durationMinutes: number,
    preferredDate?: Date,
    timeWindow?: TimeWindow
  ): Promise<Date | null> {
    const startDate = new Date(afterDate);
    startDate.setMinutes(startDate.getMinutes() + 15);

    return SlotFinder.findEarliestSlot({
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
  private static isConfirmation(message: string): boolean {
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
  private static isDecline(message: string): boolean {
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
  private static async triggerHandover(
    conversationId: string,
    clientId: string,
    reason: string,
    urgencyScore: number,
    triggers: string[]
  ): Promise<void> {
    try {
      // Start handover
      await HandoverManager.startHandover({
        conversationId,
        clientId,
        reason,
        urgencyScore,
        triggers,
      });

      // Silence AI for this conversation
      ConversationMemory.markSilencedForHandover(conversationId);

      // Check if notification should be sent (throttle to prevent spam)
      const shouldNotify = await HandoverManager.shouldNotify(conversationId);

      if (shouldNotify) {
        // Build notification payload
        const lastMessages = NotificationService.getLastMessages(conversationId, 10);
        const urgencyLevel = HandoverDetectionEngine.getUrgencyLevel(urgencyScore);
        const dashboardLink = NotificationService.buildDashboardLink(clientId, conversationId);

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
        const result = await NotificationService.sendHandoverNotification(clientId, payload);

        // Mark as notified if successful
        if (result.smsSent || result.emailSent) {
          await HandoverManager.markNotified(conversationId);

          AdminLogger.log('handover_notified', conversationId, clientId, {
            smsSent: result.smsSent,
            emailSent: result.emailSent,
            urgencyScore,
            reason,
          });
        } else {
          AdminLogger.log('handover_suppressed', conversationId, clientId, {
            reason: 'notification_failed',
            errors: result.errors,
          });
        }
      } else {
        AdminLogger.log('handover_suppressed', conversationId, clientId, {
          reason: 'throttled',
          urgencyScore,
        });
      }

      // Log handover trigger
      AdminLogger.log('handover_triggered', conversationId, clientId, {
        reason,
        urgencyScore,
        urgencyLevel: HandoverDetectionEngine.getUrgencyLevel(urgencyScore),
        triggers,
      });
    } catch (error) {
      AdminLogger.log('error', conversationId, clientId, {
        error: String(error),
        context: 'triggerHandover',
      });
    }
  }
}
