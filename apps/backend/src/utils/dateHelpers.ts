/**
 * Date utility functions for JobRun
 */

/**
 * Check if two time ranges overlap
 */
export function doTimeRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * Add minutes to a date
 */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

/**
 * Parse time string (HH:MM) to hours and minutes
 */
export function parseTimeString(time: string): { hours: number; minutes: number } {
  const [hours, minutes] = time.split(':').map(Number);
  return { hours, minutes };
}

/**
 * Check if a date is within business hours
 */
export function isWithinBusinessHours(
  date: Date,
  businessHours: { start: string; end: string; days?: number[] }
): boolean {
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
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of day
 */
export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDateOnly(date: Date): string {
  return date.toISOString().split('T')[0];
}
