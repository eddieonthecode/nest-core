import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

/** Default timezone for date operations (Asia/Ho_Chi_Minh) */
const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault(DEFAULT_TIMEZONE);

/** Date unit types supported by dayjs */
type DateUnit = dayjs.ManipulateType;

/**
 * Date utility functions for common date operations.
 * Provides timezone-aware date manipulation, formatting, and comparison utilities.
 *
 * @example
 * ```typescript
 * // Get current UTC time
 * const now = dateUtil.now();
 *
 * // Get start of day in specific timezone
 * const startOfDay = dateUtil.startOfDay(new Date(), 'America/New_York');
 *
 * // Format date
 * const formatted = dateUtil.format(date, 'YYYY-MM-DD HH:mm:ss');
 * ```
 */
export const dateUtil = {
  /**
   * Get current time in UTC.
   *
   * @returns Date - Current UTC date/time
   *
   * @example
   * ```typescript
   * const now = dateUtil.now();
   * // Returns: 2024-01-01T12:00:00.000Z (UTC)
   * ```
   */
  now() {
    return dayjs().utc().toDate();
  },

  /**
   * Get start of day for a given date in a specific timezone.
   *
   * @param date - Optional date (defaults to current date)
   * @param timezone - Timezone (defaults to Asia/Ho_Chi_Minh)
   * @returns Date - Start of day (00:00:00) in specified timezone
   *
   * @example
   * ```typescript
   * const start = dateUtil.startOfDay(new Date());
   * // Returns: 2024-01-01T00:00:00.000Z (start of day in default timezone)
   *
   * const startNY = dateUtil.startOfDay(new Date(), 'America/New_York');
   * // Returns: start of day in New York timezone
   * ```
   */
  startOfDay(date?: Date | string, timezone = DEFAULT_TIMEZONE) {
    return dayjs(date).tz(timezone).startOf("day").toDate();
  },

  /**
   * Get end of day for a given date in a specific timezone.
   *
   * @param date - Optional date (defaults to current date)
   * @param timezone - Timezone (defaults to Asia/Ho_Chi_Minh)
   * @returns Date - End of day (23:59:59) in specified timezone
   *
   * @example
   * ```typescript
   * const end = dateUtil.endOfDay(new Date());
   * // Returns: 2024-01-01T23:59:59.000Z (end of day in default timezone)
   * ```
   */
  endOfDay(date?: Date | string, timezone = DEFAULT_TIMEZONE) {
    return dayjs(date).tz(timezone).endOf("day").toDate();
  },

  /**
   * Get start of month for a given date in a specific timezone.
   *
   * @param date - Optional date (defaults to current date)
   * @param timezone - Timezone (defaults to Asia/Ho_Chi_Minh)
   * @returns Date - Start of month (first day at 00:00:00)
   *
   * @example
   * ```typescript
   * const start = dateUtil.startOfMonth(new Date());
   * // Returns: 2024-01-01T00:00:00.000Z (start of current month)
   * ```
   */
  startOfMonth(date?: Date | string, timezone = DEFAULT_TIMEZONE) {
    return dayjs(date).tz(timezone).startOf("month").toDate();
  },

  /**
   * Get end of month for a given date in a specific timezone.
   *
   * @param date - Optional date (defaults to current date)
   * @param timezone - Timezone (defaults to Asia/Ho_Chi_Minh)
   * @returns Date - End of month (last day at 23:59:59)
   *
   * @example
   * ```typescript
   * const end = dateUtil.endOfMonth(new Date());
   * // Returns: 2024-01-31T23:59:59.000Z (end of current month)
   * ```
   */
  endOfMonth(date?: Date | string, timezone = DEFAULT_TIMEZONE) {
    return dayjs(date).tz(timezone).endOf("month").toDate();
  },

  /**
   * Add a specified amount of time to a date.
   *
   * @param date - Base date
   * @param value - Amount to add
   * @param unit - Time unit (days, months, years, hours, etc.)
   * @returns Date - New date with time added
   *
   * @example
   * ```typescript
   * const future = dateUtil.add(new Date(), 7, 'days');
   * // Returns: date 7 days from now
   *
   * const future = dateUtil.add(new Date(), 1, 'month');
   * // Returns: date 1 month from now
   * ```
   */
  add(date: Date | string, value: number, unit: DateUnit) {
    return dayjs(date).utc().add(value, unit).toDate();
  },

  /**
   * Convert a date to a specific timezone.
   *
   * @param date - Date to convert
   * @param timeZone - Target timezone (defaults to Asia/Ho_Chi_Minh)
   * @returns Date - Date converted to target timezone
   *
   * @example
   * ```typescript
   * const localDate = dateUtil.convertToTimeZone(utcDate, 'America/New_York');
   * // Returns: same moment expressed in New York timezone
   * ```
   */
  convertToTimeZone(date: Date | string, timeZone: string = DEFAULT_TIMEZONE) {
    const d = dayjs(date).tz(timeZone);

    return new Date(
      d.year(),
      d.month(),
      d.date(),
      d.hour(),
      d.minute(),
      d.second(),
      d.millisecond(),
    );
  },

  /**
   * Compare two dates with optional timezone and time exclusion.
   *
   * @param date1 - First date to compare
   * @param date2 - Second date to compare
   * @param options - Comparison options
   * @param options.excludeTime - If true, only compare dates (ignore time)
   * @param options.timezone - Timezone for comparison
   * @returns number - -1 if date1 < date2, 0 if equal, 1 if date1 > date2
   *
   * @example
   * ```typescript
   * // Compare full dates
   * const result = dateUtil.compareDates(date1, date2);
   * // Returns: -1, 0, or 1
   *
   * // Compare only dates (ignore time)
   * const result = dateUtil.compareDates(date1, date2, { excludeTime: true });
   * // Returns: comparison based on calendar dates only
   * ```
   */
  compareDates(
    date1: Date | string,
    date2: Date | string,
    options?: {
      excludeTime: boolean;
      timezone: string;
    },
  ): number {
    let d1 = dayjs.utc(date1);
    let d2 = dayjs.utc(date2);

    if (!d1.isValid() || !d2.isValid()) return 0;

    if (options?.excludeTime) {
      const tz = options.timezone;

      d1 = d1.tz(tz).startOf("day").utc();
      d2 = d2.tz(tz).startOf("day").utc();
    }

    if (d1.isBefore(d2)) return -1;
    if (d1.isAfter(d2)) return 1;
    return 0;
  },

  /**
   * Format a date using a dayjs template.
   *
   * @param date - Optional date to format (defaults to current date)
   * @param template - Dayjs format template (defaults to 'YYYY-MM-DD')
   * @returns string - Formatted date string
   *
   * @example
   * ```typescript
   * const formatted = dateUtil.format(new Date(), 'YYYY-MM-DD HH:mm:ss');
   * // Returns: '2024-01-01 12:30:45'
   *
   * const formatted = dateUtil.format(new Date(), 'MMMM DD, YYYY');
   * // Returns: 'January 01, 2024'
   * ```
   */
  format(date?: Date | string, template: string = "YYYY-MM-DD") {
    return dayjs(date).format(template);
  },
};
