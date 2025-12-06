/**
 * HandoverDetectionEngine - Detects when conversation should escalate to human
 * PHASE 11A: Human Handover Mode
 *
 * Triggers escalation based on:
 * - Frustration markers
 * - Anger markers
 * - Confusion markers
 * - Safety flags
 * - Repeated declines
 * - Loop detection
 * - Explicit human requests
 * - VIP customer flag
 * - Complex requests
 */

import { ConversationMemory } from './ConversationMemory';

export interface HandoverDetectionResult {
  shouldEscalate: boolean;
  reason: string | null;
  urgencyScore: number; // 1-10 scale
  triggers: string[]; // List of detected triggers
}

export class HandoverDetectionEngine {
  /**
   * Main detection method - check if conversation should escalate to human
   */
  static detectHandover(
    message: string,
    conversationId: string,
    isVIP: boolean = false
  ): HandoverDetectionResult {
    const normalized = message.toLowerCase().trim();
    const triggers: string[] = [];
    let urgencyScore = 0;
    let reason: string | null = null;

    // ═══════════════════════════════════════════════════════════════
    // TRIGGER 1: EXPLICIT HUMAN REQUEST
    // ═══════════════════════════════════════════════════════════════
    if (this.isExplicitHumanRequest(normalized)) {
      triggers.push('explicit_human_request');
      urgencyScore = Math.max(urgencyScore, 8);
      reason = 'Customer requested to speak with a human';
    }

    // ═══════════════════════════════════════════════════════════════
    // TRIGGER 2: FRUSTRATION MARKERS
    // ═══════════════════════════════════════════════════════════════
    if (this.isFrustrated(normalized)) {
      triggers.push('frustration_detected');
      urgencyScore = Math.max(urgencyScore, 7);
      reason = reason || 'Customer showing signs of frustration';
    }

    // ═══════════════════════════════════════════════════════════════
    // TRIGGER 3: ANGER MARKERS
    // ═══════════════════════════════════════════════════════════════
    if (this.isAngry(normalized)) {
      triggers.push('anger_detected');
      urgencyScore = Math.max(urgencyScore, 9);
      reason = 'Customer showing signs of anger';
    }

    // ═══════════════════════════════════════════════════════════════
    // TRIGGER 4: CONFUSION MARKERS
    // ═══════════════════════════════════════════════════════════════
    if (this.isConfused(normalized)) {
      triggers.push('confusion_detected');
      urgencyScore = Math.max(urgencyScore, 6);
      reason = reason || 'Customer appears confused';
    }

    // ═══════════════════════════════════════════════════════════════
    // TRIGGER 5: SAFETY FLAGS (from SafetyFilter)
    // ═══════════════════════════════════════════════════════════════
    // NOTE: This should be checked separately via SafetyFilter
    // If SafetyFilter.check() returns unsafe, that triggers immediate escalation
    // This is handled in SchedulingBrain

    // ═══════════════════════════════════════════════════════════════
    // TRIGGER 6: REPEATED DECLINES
    // ═══════════════════════════════════════════════════════════════
    const declineCount = ConversationMemory.getDeclineCount(conversationId);
    if (declineCount >= 3) {
      triggers.push('repeated_declines');
      urgencyScore = Math.max(urgencyScore, 7);
      reason = reason || `Customer declined ${declineCount} time slots`;
    }

    // ═══════════════════════════════════════════════════════════════
    // TRIGGER 7: LOOP DETECTION
    // ═══════════════════════════════════════════════════════════════
    const loopCount = ConversationMemory.getLoopCount(conversationId);
    if (loopCount >= 4) {
      triggers.push('loop_detected');
      urgencyScore = Math.max(urgencyScore, 8);
      reason = reason || 'Conversation stuck in loop';
    }

    // ═══════════════════════════════════════════════════════════════
    // TRIGGER 8: VIP CUSTOMER FLAG
    // ═══════════════════════════════════════════════════════════════
    if (isVIP) {
      triggers.push('vip_customer');
      urgencyScore = Math.max(urgencyScore, 10);
      reason = reason || 'VIP customer requires attention';
    }

    // ═══════════════════════════════════════════════════════════════
    // TRIGGER 9: COMPLEX REQUESTS
    // ═══════════════════════════════════════════════════════════════
    if (this.isComplexRequest(normalized)) {
      triggers.push('complex_request');
      urgencyScore = Math.max(urgencyScore, 6);
      reason = reason || 'Request too complex for AI';
    }

    // ═══════════════════════════════════════════════════════════════
    // TRIGGER 10: CONTRADICTION DETECTION
    // ═══════════════════════════════════════════════════════════════
    const contradictionCount = ConversationMemory.getContradictionCount(conversationId);
    if (contradictionCount >= 2) {
      triggers.push('contradictions_detected');
      urgencyScore = Math.max(urgencyScore, 7);
      reason = reason || 'Customer provided contradicting information';
    }

    // ═══════════════════════════════════════════════════════════════
    // DECISION: ESCALATE OR NOT
    // ═══════════════════════════════════════════════════════════════
    const shouldEscalate = triggers.length > 0 && urgencyScore >= 6;

    return {
      shouldEscalate,
      reason,
      urgencyScore,
      triggers,
    };
  }

  /**
   * Detect explicit request for human
   */
  private static isExplicitHumanRequest(normalized: string): boolean {
    const patterns = [
      'speak to a human',
      'talk to a real person',
      'speak to someone',
      'talk to someone',
      'human please',
      'real person',
      'not a bot',
      'actual person',
      'speak to owner',
      'talk to owner',
      'speak to manager',
      'talk to manager',
      'can i speak',
      'can i talk',
      'let me speak',
      'let me talk',
      'want to speak',
      'want to talk',
      'need to speak',
      'need to talk',
    ];

    return patterns.some((pattern) => normalized.includes(pattern));
  }

  /**
   * Detect frustration markers
   */
  private static isFrustrated(normalized: string): boolean {
    const patterns = [
      'this is ridiculous',
      'this is frustrating',
      'not working',
      'this sucks',
      'waste of time',
      'seriously?',
      'come on',
      'for real?',
      'are you kidding',
      'you kidding me',
      'this again',
      'over and over',
      'keep asking',
      'already told you',
      'i said',
      'listen to me',
      'pay attention',
    ];

    return patterns.some((pattern) => normalized.includes(pattern));
  }

  /**
   * Detect anger markers
   */
  private static isAngry(normalized: string): boolean {
    const patterns = [
      'fuck',
      'shit',
      'damn',
      'pissed',
      'angry',
      'furious',
      'ridiculous',
      'unacceptable',
      'terrible',
      'worst',
      'horrible',
      'pathetic',
      'useless',
      'incompetent',
      'idiot',
      'stupid',
    ];

    // Check for ALL CAPS (indicates shouting)
    const hasAllCaps = normalized.length > 5 && normalized === normalized.toUpperCase();

    // Check for excessive punctuation (!!!, ???)
    const hasExcessivePunctuation = /[!?]{3,}/.test(normalized);

    return (
      patterns.some((pattern) => normalized.includes(pattern)) ||
      hasAllCaps ||
      hasExcessivePunctuation
    );
  }

  /**
   * Detect confusion markers
   */
  private static isConfused(normalized: string): boolean {
    const patterns = [
      "i don't understand",
      "don't get it",
      'confused',
      'what do you mean',
      'what are you asking',
      'not sure what',
      "i'm lost",
      'makes no sense',
      'unclear',
      'explain',
      'huh?',
      'what?',
      '???',
    ];

    // Check for excessive question marks
    const hasExcessiveQuestions = (normalized.match(/\?/g) || []).length >= 3;

    return (
      patterns.some((pattern) => normalized.includes(pattern)) ||
      hasExcessiveQuestions
    );
  }

  /**
   * Detect complex requests beyond AI capability
   */
  private static isComplexRequest(normalized: string): boolean {
    const patterns = [
      'multiple people',
      'group booking',
      'team booking',
      'special request',
      'custom',
      'different times',
      'recurring',
      'every week',
      'standing appointment',
      'change my schedule',
      'reschedule everything',
      'cancel all',
      'pricing question',
      'how much',
      'cost',
      'payment',
      'refund',
      'discount',
      'package',
      'membership',
    ];

    return patterns.some((pattern) => normalized.includes(pattern));
  }

  /**
   * Check if message indicates customer wants to cancel/leave
   */
  static isAbandoning(normalized: string): boolean {
    const patterns = [
      'never mind',
      'nevermind',
      'forget it',
      'cancel',
      'not interested',
      "i'm done",
      'goodbye',
      'bye',
      'leave me alone',
      "don't bother",
      "i'll call",
      "i'll try later",
    ];

    return patterns.some((pattern) => normalized.includes(pattern));
  }

  /**
   * Get urgency level description
   */
  static getUrgencyLevel(score: number): string {
    if (score >= 9) return 'CRITICAL';
    if (score >= 7) return 'HIGH';
    if (score >= 5) return 'MEDIUM';
    return 'LOW';
  }
}
