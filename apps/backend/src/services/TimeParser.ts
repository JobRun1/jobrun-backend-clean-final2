/**
 * TimeParser - Natural Language Time Interpretation
 * Parses text like "around 3", "after 4", "evening", "lunchtime"
 */

export interface TimeWindow {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

export class TimeParser {
  /**
   * Parse natural language time expressions into time windows
   */
  static parse(text: string): TimeWindow | null {
    const normalized = text.toLowerCase().trim();

    // Morning
    if (this.matches(normalized, ['morning', 'early', 'am'])) {
      return { startHour: 8, startMinute: 0, endHour: 12, endMinute: 0 };
    }

    // Afternoon
    if (this.matches(normalized, ['afternoon', 'pm'])) {
      return { startHour: 12, startMinute: 0, endHour: 17, endMinute: 0 };
    }

    // Evening
    if (this.matches(normalized, ['evening', 'tonight'])) {
      return { startHour: 17, startMinute: 0, endHour: 21, endMinute: 0 };
    }

    // Lunchtime
    if (this.matches(normalized, ['lunch', 'lunchtime', 'midday', 'noon'])) {
      return { startHour: 12, startMinute: 0, endHour: 14, endMinute: 0 };
    }

    // Early evening
    if (normalized.includes('early evening')) {
      return { startHour: 17, startMinute: 0, endHour: 18, endMinute: 30 };
    }

    // Late afternoon
    if (normalized.includes('late afternoon')) {
      return { startHour: 15, startMinute: 0, endHour: 17, endMinute: 0 };
    }

    // "After X" patterns
    const afterMatch = normalized.match(/after\s+(\d+)/);
    if (afterMatch) {
      const hour = parseInt(afterMatch[1]);
      if (hour >= 1 && hour <= 12) {
        // Assume PM if less than 12
        const actualHour = hour < 8 ? hour + 12 : hour;
        return { startHour: actualHour, startMinute: 0, endHour: 21, endMinute: 0 };
      }
    }

    // "Around X" or "about X" patterns
    const aroundMatch = normalized.match(/(?:around|about)\s+(\d+)(?::(\d+))?/);
    if (aroundMatch) {
      const hour = parseInt(aroundMatch[1]);
      const minute = aroundMatch[2] ? parseInt(aroundMatch[2]) : 0;
      const actualHour = hour < 8 && !normalized.includes('am') ? hour + 12 : hour;

      // 1-hour window around the time
      return {
        startHour: actualHour,
        startMinute: minute,
        endHour: actualHour + 1,
        endMinute: minute,
      };
    }

    // Specific time patterns: "3pm", "3:30pm", "15:00"
    const timeMatch = normalized.match(/(\d+)(?::(\d+))?\s*(am|pm)?/);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const meridiem = timeMatch[3];

      if (meridiem === 'pm' && hour < 12) {
        hour += 12;
      } else if (meridiem === 'am' && hour === 12) {
        hour = 0;
      } else if (!meridiem && hour < 8) {
        // Assume PM for hours 1-7 without meridiem
        hour += 12;
      }

      // Exact time with 30-minute window
      return {
        startHour: hour,
        startMinute: minute,
        endHour: hour,
        endMinute: minute + 30,
      };
    }

    return null;
  }

  /**
   * Helper to check if text contains any of the keywords
   */
  private static matches(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  /**
   * Format time window as human-readable string
   */
  static formatWindow(window: TimeWindow): string {
    const formatTime = (hour: number, minute: number) => {
      const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const m = minute > 0 ? `:${minute.toString().padStart(2, '0')}` : '';
      const meridiem = hour >= 12 ? 'PM' : 'AM';
      return `${h}${m} ${meridiem}`;
    };

    return `${formatTime(window.startHour, window.startMinute)} - ${formatTime(window.endHour, window.endMinute)}`;
  }

  /**
   * Check if a specific time falls within a window
   */
  static isInWindow(time: Date, window: TimeWindow): boolean {
    const hour = time.getHours();
    const minute = time.getMinutes();
    const timeInMinutes = hour * 60 + minute;
    const startInMinutes = window.startHour * 60 + window.startMinute;
    const endInMinutes = window.endHour * 60 + window.endMinute;

    return timeInMinutes >= startInMinutes && timeInMinutes <= endInMinutes;
  }

  /**
   * PHASE 10: Check if time expression is ambiguous/vague
   * Returns true for vague expressions like "ish", "after school", "before dinner"
   */
  static isAmbiguous(text: string): boolean {
    const normalized = text.toLowerCase().trim();

    // Vague patterns that need clarification
    const vaguePatterns = [
      'ish',
      'around',
      'about',
      'sometime',
      'after school',
      'before dinner',
      'after work',
      'before lunch',
      'end of day',
      'start of day',
      'whenever',
      'anytime',
      'flexible',
    ];

    return vaguePatterns.some((pattern) => normalized.includes(pattern));
  }

  /**
   * PHASE 10: Check if time window is too broad (needs refinement)
   * Returns true for windows > 4 hours
   */
  static isTooBroad(window: TimeWindow | null): boolean {
    if (!window) return false;

    const startMinutes = window.startHour * 60 + window.startMinute;
    const endMinutes = window.endHour * 60 + window.endMinute;
    const durationMinutes = endMinutes - startMinutes;

    // Window broader than 4 hours needs refinement
    return durationMinutes > 240;
  }
}
