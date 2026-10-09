import { nextOccurrences } from "./series";
import { GROUP_EARLY_MINUTES, SESSION_DEFAULT_HOUR, SESSION_MIN_NOTICE_MINUTES } from "@/config/nomad";
export type IdleSlot = { id: string; weekday: number; start_time: string; end_time: string; seats: number | null; note: string | null; created_at: string };
export function suggestedSession(slots: IdleSlot[], tz: string, now = new Date()): { date: string; time: string } {
  const from = new Date(now.getTime() + SESSION_MIN_NOTICE_MINUTES * 60_000);
  const available = slots.map(s => nextOccurrences(s.weekday, s.start_time, tz, from, 1)[0]).filter(Boolean).sort((a,b) => +a - +b);
  const next = available[0] ?? [1,2,3,4,5].map(day => nextOccurrences(day, SESSION_DEFAULT_HOUR, tz, from, 1)[0]).sort((a,b) => +a - +b)[0];
  return { date: next.toLocaleDateString("en-CA", { timeZone: tz }), time: next.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) };
}
export function groupBenefitState(count: number, minimum: number, starts: string, ends: string, now = Date.now()) {
  return { missing: Math.max(0, minimum - count), fraction: Math.min(1, count / minimum), available: count >= minimum && now >= Date.parse(starts) - GROUP_EARLY_MINUTES * 60_000 && now <= Date.parse(ends) };
}
