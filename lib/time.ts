/**
 * The restaurant runs on Pakistan Standard Time (UTC+5, no daylight saving).
 * Servers are often on UTC, so "today" and "hour of day" are computed explicitly.
 */
export const PKT_OFFSET = 5 * 3_600_000;
export const DAY_MS = 86_400_000;

export function startOfDay(ts: number) {
  return Math.floor((ts + PKT_OFFSET) / DAY_MS) * DAY_MS - PKT_OFFSET;
}

export function hourOf(ts: number) {
  return new Date(ts + PKT_OFFSET).getUTCHours();
}

/** 0 = Sunday … 6 = Saturday */
export function weekdayOf(ts: number) {
  return new Date(ts + PKT_OFFSET).getUTCDay();
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function weekdayLabel(ts: number) {
  return WEEKDAYS[weekdayOf(ts)];
}

export function dateKey(ts: number) {
  const d = new Date(ts + PKT_OFFSET);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function shortDate(ts: number) {
  const d = new Date(ts + PKT_OFFSET);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}
