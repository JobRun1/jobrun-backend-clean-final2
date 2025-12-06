/**
 * UrgencyClassifier - Detect Urgent Booking Requests
 * Keywords: urgent, asap, emergency, today, soon
 */

export class UrgencyClassifier {
  private static readonly URGENT_KEYWORDS = [
    'urgent',
    'asap',
    'as soon as possible',
    'emergency',
    'today',
    'right now',
    'immediately',
    'quick',
    'quickly',
    'soon',
    'soonest',
    'earliest',
    'first available',
    'next available',
  ];

  private static readonly HIGH_PRIORITY_PHRASES = [
    'today if possible',
    'as early as possible',
    'first thing',
    'straight away',
    'right away',
  ];

  /**
   * Classify if a message indicates urgency
   */
  static isUrgent(text: string): boolean {
    const normalized = text.toLowerCase().trim();

    // Check for high-priority phrases first
    for (const phrase of this.HIGH_PRIORITY_PHRASES) {
      if (normalized.includes(phrase)) {
        return true;
      }
    }

    // Check for urgent keywords
    for (const keyword of this.URGENT_KEYWORDS) {
      if (normalized.includes(keyword)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract urgency level (for future use)
   */
  static getUrgencyLevel(text: string): 'none' | 'low' | 'medium' | 'high' {
    const normalized = text.toLowerCase().trim();

    // High urgency
    if (
      normalized.includes('emergency') ||
      normalized.includes('urgent') ||
      normalized.includes('asap')
    ) {
      return 'high';
    }

    // Medium urgency
    if (
      normalized.includes('today') ||
      normalized.includes('soon') ||
      normalized.includes('first available')
    ) {
      return 'medium';
    }

    // Low urgency
    if (
      normalized.includes('whenever') ||
      normalized.includes('no rush') ||
      normalized.includes('flexible')
    ) {
      return 'low';
    }

    return 'none';
  }
}
