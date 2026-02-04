export const sqlUtil = {
  /**
   * General truncation by unit (day, month, week, year)
   */
  getTruncatedDateByTimezone(
    column: string,
    unit: "day" | "month" | "week" | "year",
    tz: string,
  ): string {
    return `DATE_TRUNC('${unit}', ${column}::timestamptz AT TIME ZONE '${tz}')`;
  },
};
