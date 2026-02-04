import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault(DEFAULT_TIMEZONE);

type DateUnit = dayjs.ManipulateType;

export const dateUtil = {
  /**
   * Get current time in UTC
   */
  now() {
    return dayjs().utc().toDate();
  },

  /**
   * Get start of day
   */
  startOfDay(date?: Date | string, timezone = DEFAULT_TIMEZONE) {
    return dayjs(date).tz(timezone).startOf("day").toDate();
  },

  /**
   * Get end of day
   */
  endOfDay(date?: Date | string, timezone = DEFAULT_TIMEZONE) {
    return dayjs(date).tz(timezone).endOf("day").toDate();
  },

  /**
   * Get start of month
   */
  startOfMonth(date?: Date | string, timezone = DEFAULT_TIMEZONE) {
    return dayjs(date).tz(timezone).startOf("month").toDate();
  },

  /**
   * Get end of month
   */
  endOfMonth(date?: Date | string, timezone = DEFAULT_TIMEZONE) {
    return dayjs(date).tz(timezone).endOf("month").toDate();
  },

  /**
   * Add date
   */
  add(date: Date | string, value: number, unit: DateUnit) {
    return dayjs(date).utc().add(value, unit).toDate();
  },

  /**
   * Convert to timezone
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
   * Compare dates
   * @returns LessThan -1, Equal 0, GreaterThan 1
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
   * Format date
   */
  format(date?: Date | string, template: string = "YYYY-MM-DD") {
    return dayjs(date).format(template);
  },
};
