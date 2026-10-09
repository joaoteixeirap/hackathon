// Full trust data of one place (RPC place_trust): measured connection, reports, seals and
// per-fact source/date/confirmations. Never contains who measured (I5b).
import type { FactsMeta } from "./trust";

export type OutletsLevel = "none" | "few" | "many";
export type StayPolicy = "free" | "min_consumption" | "time_limit" | "pass_required" | "unknown";
export type CallResult = "ok" | "choppy" | "failed" | "not_tested";

export type PlaceTrust = {
  wifi_mbps: number | null;
  wifi_source: "osm" | "partner" | "user_test" | null;
  declared_wifi_mbps: number | null;
  upload_mbps: number | null;
  ping_ms: number | null;
  jitter_ms: number | null;
  loss_pct: number | null;
  outlets_level: OutletsLevel | null;
  has_power_outlets: boolean | null;
  quiet_level: number | null;
  call_ok_share: number | null;
  stay_policy: StayPolicy;
  stay_note: string | null;
  facts_meta: FactsMeta;
  last_verified_at: string | null;
  distinct_users_90d: number;
  seal_valid_until: string | null;
  call_ready_valid_until: string | null;
};

const num = (v: unknown) => (v == null || v === "" ? null : Number(v));

/** Normalizes the RPC payload (numerics come back as strings or numbers). */
export function toPlaceTrust(raw: unknown): PlaceTrust | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  return {
    wifi_mbps: num(r.wifi_mbps),
    wifi_source: (r.wifi_source as PlaceTrust["wifi_source"]) ?? null,
    declared_wifi_mbps: num(r.declared_wifi_mbps),
    upload_mbps: num(r.upload_mbps),
    ping_ms: num(r.ping_ms),
    jitter_ms: num(r.jitter_ms),
    loss_pct: num(r.loss_pct),
    outlets_level: (r.outlets_level as OutletsLevel) ?? null,
    has_power_outlets: (r.has_power_outlets as boolean | null) ?? null,
    quiet_level: num(r.quiet_level),
    call_ok_share: num(r.call_ok_share),
    stay_policy: ((r.stay_policy as StayPolicy) ?? "unknown") as StayPolicy,
    stay_note: (r.stay_note as string | null) ?? null,
    facts_meta: (r.facts_meta as FactsMeta) ?? {},
    last_verified_at: (r.last_verified_at as string | null) ?? null,
    distinct_users_90d: Number(r.distinct_users_90d ?? 0),
    seal_valid_until: (r.seal_valid_until as string | null) ?? null,
    call_ready_valid_until: (r.call_ready_valid_until as string | null) ?? null,
  };
}

export const OUTLETS_LABEL: Record<OutletsLevel, string> = { none: "Nenhuma", few: "Poucas", many: "Muitas" };
export const NOISE_LABEL = ["", "Barulhento", "Movimentado", "Moderado", "Tranquilo", "Silencioso"];
export const CALL_LABEL: Record<CallResult, string> = { ok: "Funcionou", choppy: "Picotou", failed: "Falhou", not_tested: "Não testei" };
export const STAY_LABEL: Record<StayPolicy, string> = {
  free: "Livre",
  min_consumption: "Consumo mínimo",
  time_limit: "Limite de tempo",
  pass_required: "Precisa de passe",
  unknown: "Não sei",
};
export const CROWD_LABEL = ["", "Vazio", "Tranquilo", "Moderado", "Cheio", "Lotado"];

/** Outlets from the new level, or the legacy boolean when only that exists. */
export function outletsText(t: Pick<PlaceTrust, "outlets_level" | "has_power_outlets">): string | null {
  if (t.outlets_level) return OUTLETS_LABEL[t.outlets_level];
  if (t.has_power_outlets == null) return null;
  return t.has_power_outlets ? "Disponíveis" : "Poucas";
}
