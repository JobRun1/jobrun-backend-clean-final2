"use strict";
/**
 * Date utility functions for JobRun
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.doTimeRangesOverlap = doTimeRangesOverlap;
exports.addMinutes = addMinutes;
exports.parseTimeString = parseTimeString;
exports.isWithinBusinessHours = isWithinBusinessHours;
exports.startOfDay = startOfDay;
exports.endOfDay = endOfDay;
exports.formatDateOnly = formatDateOnly;
/**
 * Check if two time ranges overlap
 */
function doTimeRangesOverlap(start1, end1, start2, end2) {
    return start1 < end2 && start2 < end1;
}
/**
 * Add minutes to a date
 */
function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60000);
}
/**
 * Parse time string (HH:MM) to hours and minutes
 */
function parseTimeString(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return { hours, minutes };
}
/**
 * Check if a date is within business hours
 */
function isWithinBusinessHours(date, businessHours) {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    // Check if day is in allowed days (default Monday-Friday: 1-5)
    const allowedDays = businessHours.days || [1, 2, 3, 4, 5];
    if (!allowedDays.includes(dayOfWeek)) {
        return false;
    }
    const startTime = parseTimeString(businessHours.start);
    const endTime = parseTimeString(businessHours.end);
    const dateHours = date.getHours();
    const dateMinutes = date.getMinutes();
    const dateTimeInMinutes = dateHours * 60 + dateMinutes;
    const startTimeInMinutes = startTime.hours * 60 + startTime.minutes;
    const endTimeInMinutes = endTime.hours * 60 + endTime.minutes;
    return dateTimeInMinutes >= startTimeInMinutes && dateTimeInMinutes < endTimeInMinutes;
}
/**
 * Get start of day
 */
function startOfDay(date) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}
/**
 * Get end of day
 */
function endOfDay(date) {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
}
/**
 * Format date as YYYY-MM-DD
 */
function formatDateOnly(date) {
    return date.toISOString().split('T')[0];
}
//# sourceMappingURL=dateHelpers.js.map