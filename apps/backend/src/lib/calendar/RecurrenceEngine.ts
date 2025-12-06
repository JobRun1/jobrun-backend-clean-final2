import { RecurrenceFrequency } from "@prisma/client";

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  byWeekday?: string;
  byMonthday?: string;
  endDate?: Date;
  occurrences?: number;
}

export interface BookingOccurrence {
  date: Date;
  start: Date;
  end: Date;
  isRecurring: boolean;
  recurrenceRuleId?: string;
  originalBookingId: string;
  occurrenceIndex?: number;
}

export class RecurrenceEngine {
  static expandRule(
    rule: RecurrenceRule,
    baseStart: Date,
    baseEnd: Date,
    rangeStart: Date,
    rangeEnd: Date,
    bookingId: string,
    recurrenceRuleId?: string
  ): BookingOccurrence[] {
    const occurrences: BookingOccurrence[] = [];
    let currentDate = new Date(baseStart);
    let index = 0;
    const maxOccurrences = rule.occurrences || 1000;

    while (
      currentDate <= rangeEnd &&
      index < maxOccurrences &&
      (!rule.endDate || currentDate <= rule.endDate)
    ) {
      if (currentDate >= rangeStart) {
        if (this.matchesRule(rule, currentDate)) {
          const duration = baseEnd.getTime() - baseStart.getTime();
          const occurrenceStart = new Date(currentDate);
          const occurrenceEnd = new Date(currentDate.getTime() + duration);

          occurrences.push({
            date: new Date(currentDate),
            start: occurrenceStart,
            end: occurrenceEnd,
            isRecurring: true,
            recurrenceRuleId,
            originalBookingId: bookingId,
            occurrenceIndex: index,
          });
        }
      }

      currentDate = this.getNextDate(rule, currentDate);
      index++;

      if (index > maxOccurrences * 2) break;
    }

    return occurrences;
  }

  private static matchesRule(
    rule: RecurrenceRule,
    date: Date
  ): boolean {
    switch (rule.frequency) {
      case "WEEKLY":
        if (rule.byWeekday) {
          const weekdays = rule.byWeekday.split(",").map((d) => parseInt(d));
          return weekdays.includes(date.getDay());
        }
        return true;

      case "MONTHLY":
        if (rule.byMonthday) {
          const monthdays = rule.byMonthday.split(",").map((d) => parseInt(d));
          return monthdays.includes(date.getDate());
        }
        return true;

      case "DAILY":
      case "CUSTOM":
        return true;

      default:
        return true;
    }
  }

  private static getNextDate(rule: RecurrenceRule, current: Date): Date {
    const next = new Date(current);

    switch (rule.frequency) {
      case "DAILY":
        next.setDate(next.getDate() + rule.interval);
        break;

      case "WEEKLY":
        next.setDate(next.getDate() + 7 * rule.interval);
        break;

      case "MONTHLY":
        next.setMonth(next.getMonth() + rule.interval);
        break;

      case "CUSTOM":
        next.setDate(next.getDate() + rule.interval);
        break;
    }

    return next;
  }

  static getOccurrenceDate(
    baseDate: Date,
    rule: RecurrenceRule,
    occurrenceIndex: number
  ): Date {
    let date = new Date(baseDate);

    for (let i = 0; i < occurrenceIndex; i++) {
      date = this.getNextDate(rule, date);
    }

    return date;
  }

  static isWithinSeries(
    date: Date,
    baseDate: Date,
    rule: RecurrenceRule
  ): boolean {
    if (date < baseDate) return false;
    if (rule.endDate && date > rule.endDate) return false;

    return this.matchesRule(rule, date);
  }
}
