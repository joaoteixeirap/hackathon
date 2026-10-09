// Keeps the seed's demo data presentable on demo day (`pnpm demo:refresh`), without a reset.
// Only rows marked is_demo (and the fixed demo profiles) are touched.

export const DEMO_PROFILE_IDS = [
  "00000000-0000-4000-8000-0000000000a1",
  "00000000-0000-4000-8000-0000000000a2",
  "00000000-0000-4000-8000-0000000000a3",
  "00000000-0000-4000-8000-0000000000a6",
  "00000000-0000-4000-8000-0000000000a7",
  "00000000-0000-4000-8000-0000000000a8",
];

const TZ = "America/Sao_Paulo";
const DAY_MS = 86_400_000;

/** "YYYY-MM-DD" of an instant in Brasília time. */
export function localDay(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / DAY_MS);
}

export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T12:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

export type DemoActivity = { id: string; starts_at: string; ends_at: string };

/**
 * Shifts all demo activities by whole days so the earliest one starts tomorrow (local time),
 * keeping each hour and the spacing between them. Whole days keep the local hour because
 * pilot cities have no daylight saving time.
 */
export function shiftDemoActivities(rows: DemoActivity[], now = new Date()): { shiftDays: number; rows: DemoActivity[] } {
  if (rows.length === 0) return { shiftDays: 0, rows };
  const earliest = rows.reduce((m, r) => (r.starts_at < m ? r.starts_at : m), rows[0].starts_at);
  const shiftDays = daysBetween(localDay(new Date(earliest)), addDays(localDay(now), 1));
  const move = (iso: string) => new Date(Date.parse(iso) + shiftDays * DAY_MS).toISOString();
  return { shiftDays, rows: rows.map((r) => ({ id: r.id, starts_at: move(r.starts_at), ends_at: move(r.ends_at) })) };
}
