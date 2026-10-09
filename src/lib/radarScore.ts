// Radar "Onde trabalhar agora" (SPEC_V2 R4): suitability score from the criteria only.
// I3: nothing a partner pays for (featured, plan, offers) is an input here.
import type { OutletsLevel, StayPolicy } from "./placeTrust";

export type RadarInput = {
  /** Measured by nomads only (wifi_source = user_test); declared numbers do not score. */
  download_mbps: number | null;
  jitter_ms: number | null;
  loss_pct: number | null;
  outlets: OutletsLevel | null;
  noise: number | null; // 1 barulhento … 5 silencioso
  call_ok_share: number | null; // among tested calls
  stay_policy: StayPolicy;
  last_verified_at: string | null;
  distinct_users_90d: number;
};

export type RadarPart = "connection" | "outlets" | "noise" | "calls" | "stay" | "freshness";
export type RadarScore = {
  total: number;
  parts: Record<RadarPart, { points: number; max: number; known: boolean }>;
  confidence: "low" | "medium" | "high";
};

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const DAY_MS = 86_400_000;

const OUTLET_POINTS: Record<OutletsLevel, number> = { none: 0, few: 8, many: 15 };
const STAY_POINTS: Record<StayPolicy, number> = { free: 5, pass_required: 3, min_consumption: 3, time_limit: 1, unknown: 0 };

export function radarScore(input: RadarInput, now = Date.now()): RadarScore {
  const d = input.download_mbps;
  const stability = 1 - 0.5 * clamp((input.loss_pct ?? 0) / 5) - 0.5 * clamp((input.jitter_ms ?? 0) / 50);
  const connection = d == null ? 0 : 40 * clamp(d / 50) * stability;

  const outlets = input.outlets ? OUTLET_POINTS[input.outlets] : 0;
  const noise = input.noise != null ? ((input.noise - 1) / 4) * 15 : 0;
  const calls = input.call_ok_share != null ? 15 * clamp(input.call_ok_share) : 0;
  const stay = STAY_POINTS[input.stay_policy];

  const days = input.last_verified_at ? (now - new Date(input.last_verified_at).getTime()) / DAY_MS : null;
  const freshness = days == null ? 0 : days <= 30 ? 10 : days <= 60 ? 6 : days <= 90 ? 3 : 0;

  const parts: RadarScore["parts"] = {
    connection: { points: connection, max: 40, known: d != null },
    outlets: { points: outlets, max: 15, known: input.outlets != null },
    noise: { points: noise, max: 15, known: input.noise != null },
    calls: { points: calls, max: 15, known: input.call_ok_share != null },
    stay: { points: stay, max: 5, known: input.stay_policy !== "unknown" },
    freshness: { points: freshness, max: 10, known: days != null },
  };
  const total = Math.round(Object.values(parts).reduce((s, p) => s + p.points, 0));
  const n = input.distinct_users_90d;
  return { total, parts, confidence: n <= 1 ? "low" : n <= 4 ? "medium" : "high" };
}

/** Radar order: score, then the most recently verified, then name. Never by sponsorship (I3). */
export function rankForRadar<T extends { name: string; score: RadarScore; last_verified_at: string | null }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      b.score.total - a.score.total ||
      (b.last_verified_at ?? "").localeCompare(a.last_verified_at ?? "") ||
      a.name.localeCompare(b.name, "pt-BR"),
  );
}
