// Radar filters (SPEC_V2 R4) and the shared "Modo chamada" / "Dados recentes" rules
// also used by the map chips (T2). Pure functions.
import { CALL_MIN_DOWN_MBPS, CALL_MIN_NOISE } from "@/config/nomad";
import { haversine } from "./geo";
import type { PlaceTrust } from "./placeTrust";
import type { RadarInput } from "./radarScore";
import { freshnessOf, isCallReady, type FactMeta } from "./trust";

export type RadarFilter = "now" | "call" | "outlets" | "quiet" | "recent" | "near";

export const RADAR_FILTER_LABEL: Record<RadarFilter, string> = {
  now: "Agora",
  call: "Modo chamada",
  outlets: "Tomadas",
  quiet: "Silencioso",
  recent: "Dados recentes",
  near: "Perto de mim",
};

/** hipótese: "Perto de mim" radius */
export const RADAR_NEAR_METERS = 2000;

type Measured = Pick<PlaceTrust, "wifi_mbps" | "wifi_source" | "quiet_level" | "seal_valid_until" | "call_ready_valid_until">;

/** Measured median download only (declared numbers never qualify). */
export function measuredDownload(p: Pick<PlaceTrust, "wifi_mbps" | "wifi_source">): number | null {
  return p.wifi_source === "user_test" ? p.wifi_mbps : null;
}

/** "Pronto para chamadas" or, lacking it, measured download ≥ 15 Mbps and noise ≥ 3. */
export function isCallMode(p: Measured, now = Date.now()): boolean {
  if (isCallReady(p, now)) return true;
  const d = measuredDownload(p);
  return d != null && d >= CALL_MIN_DOWN_MBPS && (p.quiet_level ?? 0) >= CALL_MIN_NOISE;
}

/** "Dados recentes" hides possibly-outdated and never-verified data. */
export function isRecent(wifiFact: FactMeta | null | undefined, now = Date.now()): boolean {
  const f = freshnessOf(wifiFact ?? undefined, now);
  return f === "fresh" || f === "aging";
}

export function hasOutlets(p: Pick<PlaceTrust, "outlets_level" | "has_power_outlets">): boolean {
  return p.outlets_level ? p.outlets_level !== "none" : p.has_power_outlets === true;
}

export function radarInput(p: PlaceTrust): RadarInput {
  return {
    download_mbps: measuredDownload(p),
    jitter_ms: p.jitter_ms,
    loss_pct: p.loss_pct,
    outlets: p.outlets_level ?? (p.has_power_outlets == null ? null : p.has_power_outlets ? "few" : "none"),
    noise: p.quiet_level,
    call_ok_share: p.call_ok_share,
    stay_policy: p.stay_policy,
    last_verified_at: p.last_verified_at,
    distinct_users_90d: p.distinct_users_90d,
  };
}

export type FilterContext = {
  now?: number;
  isOpen?: (p: { opening_hours: string | null }) => boolean | null;
  /** In memory only; never sent anywhere (I5c). */
  near?: { lat: number; lng: number } | null;
  neighborhood?: string | null;
};

export function passesRadarFilters<P extends PlaceTrust & { lat: number; lng: number; neighborhood: string | null; opening_hours: string | null }>(
  p: P,
  filters: RadarFilter[],
  ctx: FilterContext = {},
): boolean {
  const now = ctx.now ?? Date.now();
  for (const f of filters) {
    if (f === "call" && !isCallMode(p, now)) return false;
    if (f === "outlets" && !hasOutlets(p)) return false;
    if (f === "quiet" && !((p.quiet_level ?? 0) >= 4)) return false;
    if (f === "recent" && !isRecent(p.facts_meta.wifi, now)) return false;
    if (f === "now" && ctx.isOpen && ctx.isOpen(p) !== true) return false;
    if (f === "near") {
      if (ctx.near) {
        if (haversine(ctx.near, p) > RADAR_NEAR_METERS) return false;
      } else if (ctx.neighborhood && p.neighborhood !== ctx.neighborhood) return false;
    }
  }
  return true;
}
