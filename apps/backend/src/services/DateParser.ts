/**
 * DateParser - Natural Language Date Interpretation
 * Parses "tomorrow", "Friday", "next week", "the 12th"
 */

export class DateParser {
  private static readonly DAYS_OF_WEEK = [
    'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
  ];

  private static readonly MONTHS = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];

  /**
   * Parse natural language date expressions
   */
  static parse(text: string, referenceDate: Date = new Date()): Date | null {
    const normalized = text.toLowerCase().trim();

    // Today
    if (this.matches(normalized, ['today', 'now', 'asap'])) {
      return new Date(referenceDate);
    }

    // Tomorrow
    if (this.matches(normalized, ['tomorrow', 'tmw', 'tmrw'])) {
      const date = new Date(referenceDate);
      date.setDate(date.getDate() + 1);
      return date;
    }

    // Day after tomorrow
    if (normalized.includes('day after tomorrow')) {
      const date = new Date(referenceDate);
      date.setDate(date.getDate() + 2);
      return date;
    }

    // This week / next week
    if (normalized.includes('next week')) {
      const date = new Date(referenceDate);
      date.setDate(date.getDate() + 7);
      return date;
    }

    // Day of week (e.g., "Friday", "next Monday")
    for (let i = 0; i < this.DAYS_OF_WEEK.length; i++) {
      if (normalized.includes(this.DAYS_OF_WEEK[i])) {
        const today = referenceDate.getDay();
        let daysUntil = i - today;

        // If the day has passed this week, go to next week
        if (daysUntil <= 0 || normalized.includes('next')) {
          daysUntil += 7;
        }

        const date = new Date(referenceDate);
        date.setDate(date.getDate() + daysUntil);
        return date;
      }
    }

    // Specific date: "the 12th", "12th", "on the 15th"
    const dayMatch = normalized.match(/(?:the\s+)?(\d+)(?:st|nd|rd|th)?/);
    if (dayMatch) {
      const day = parseInt(dayMatch[1]);
      if (day >= 1 && day <= 31) {
        const date = new Date(referenceDate);
        date.setDate(day);

        // If the date has already passed this month, go to next month
        if (date < referenceDate) {
          date.setMonth(date.getMonth() + 1);
        }

        return date;
      }
    }

    // Month + day: "March 15", "15 March"
    for (let i = 0; i < this.MONTHS.length; i++) {
      if (normalized.includes(this.MONTHS[i])) {
        const monthMatch = normalized.match(/(\d+)/);
        if (monthMatch) {
          const day = parseInt(monthMatch[1]);
          const date = new Date(referenceDate);
          date.setMonth(i);
          date.setDate(day);

          // If date has passed, assume next year
          if (date < referenceDate) {
            date.setFullYear(date.getFullYear() + 1);
          }

          return date;
        }
      }
    }

    // ISO date format: YYYY-MM-DD
    const isoMatch = normalized.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return new Date(isoMatch[0]);
    }

    // US date format: MM/DD or MM/DD/YYYY
    const usMatch = normalized.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if (usMatch) {
      const month = parseInt(usMatch[1]) - 1;
      const day = parseInt(usMatch[2]);
      const year = usMatch[3] ? parseInt(usMatch[3]) : referenceDate.getFullYear();

      return new Date(year, month, day);
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
   * Format date as human-readable string
   */
  static formatDate(date: Date): string {
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
      return this.DAYS_OF_WEEK[targetDate.getDay()];
    }

    // Otherwise use full date
    return targetDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Check if a date is in the past
   */
  static isPast(date: Date): boolean {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    return target < now;
  }
}
