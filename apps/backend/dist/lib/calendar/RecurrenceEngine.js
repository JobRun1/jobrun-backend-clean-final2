"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecurrenceEngine = void 0;
class RecurrenceEngine {
    static expandRule(rule, baseStart, baseEnd, rangeStart, rangeEnd, bookingId, recurrenceRuleId) {
        const occurrences = [];
        let currentDate = new Date(baseStart);
        let index = 0;
        const maxOccurrences = rule.occurrences || 1000;
        while (currentDate <= rangeEnd &&
            index < maxOccurrences &&
            (!rule.endDate || currentDate <= rule.endDate)) {
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
            if (index > maxOccurrences * 2)
                break;
        }
        return occurrences;
    }
    static matchesRule(rule, date) {
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
    static getNextDate(rule, current) {
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
    static getOccurrenceDate(baseDate, rule, occurrenceIndex) {
        let date = new Date(baseDate);
        for (let i = 0; i < occurrenceIndex; i++) {
            date = this.getNextDate(rule, date);
        }
        return date;
    }
    static isWithinSeries(date, baseDate, rule) {
        if (date < baseDate)
            return false;
        if (rule.endDate && date > rule.endDate)
            return false;
        return this.matchesRule(rule, date);
    }
}
exports.RecurrenceEngine = RecurrenceEngine;
//# sourceMappingURL=RecurrenceEngine.js.map