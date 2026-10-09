// Weekly series (SPEC_V2 S3). The database materializes occurrences (ensure_series_occurrences,
// in the city's time zone); this mirrors the rule for labels, previews and tests.
import { SERIES_WEEKS_AHEAD } from "@/config/nomad";

export const WEEKDAY_LABEL = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const WEEKDAY_PLURAL = ["todo domingo", "toda segunda", "toda terça", "toda quarta", "toda quinta", "toda sexta", "todo sábado"];

/** "14:00" → "14h"; "07:30" → "7h30". */
export function hourLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/** "Semanal · toda quinta 14h" */
export function seriesLabel(weekday: number, startTime: string): string {
  return `Semanal · ${WEEKDAY_PLURAL[weekday]} ${hourLabel(startTime)}`;
}

/** Offset (minutes) of `tz` at the UTC instant `t`. */
function offsetMinutes(t: number, tz: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(new Date(t))
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUtc - t) / 60_000);
}

/** UTC instant of a wall-clock date and time in `tz` (DST-aware). */
export function zonedToUtc(date: string, time: string, tz: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const first = guess - offsetMinutes(guess, tz) * 60_000;
  // Second pass settles instants right at a DST change.
  return new Date(guess - offsetMinutes(first, tz) * 60_000);
}

/** Local "YYYY-MM-DD" and weekday of an instant in `tz`. */
function localDay(t: Date, tz: string): { date: string; weekday: number } {
  const date = t.toLocaleDateString("en-CA", { timeZone: tz });
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return { date, weekday };
}

function addDays(date: string, n: number): string {
  return new Date(Date.parse(`${date}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

/** Next occurrences (future only), like the database does it. */
export function nextOccurrences(weekday: number, startTime: string, tz: string, from = new Date(), weeks = SERIES_WEEKS_AHEAD): Date[] {
  const today = localDay(from, tz);
  let first = addDays(today.date, (weekday - today.weekday + 7) % 7);
  if (zonedToUtc(first, startTime, tz).getTime() <= from.getTime()) first = addDays(first, 7);
  const out: Date[] = [];
  for (let i = 0; i < weeks; i++) {
    const t = zonedToUtc(addDays(first, i * 7), startTime, tz);
    if (t.getTime() > from.getTime()) out.push(t);
  }
  return out;
}

/** Weekday and start time of a series, from the first date the creator picked (local time). */
export function seriesSlot(date: string, time: string): { weekday: number; start_time: string } {
  return { weekday: new Date(`${date}T12:00:00Z`).getUTCDay(), start_time: time };
}
