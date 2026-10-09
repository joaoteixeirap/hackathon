import { describe, expect, it } from "vitest";
import type { PlaceTrust } from "./placeTrust";
import { isCallMode, isRecent, passesRadarFilters, radarInput } from "./radarFilters";

const NOW = Date.parse("2026-10-09T15:00:00Z");
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString();

const base: PlaceTrust & { lat: number; lng: number; neighborhood: string | null; opening_hours: string | null } = {
  wifi_mbps: null, wifi_source: null, declared_wifi_mbps: null, upload_mbps: null, ping_ms: null, jitter_ms: null, loss_pct: null,
  outlets_level: null, has_power_outlets: null, quiet_level: null, call_ok_share: null, stay_policy: "unknown", stay_note: null,
  facts_meta: {}, last_verified_at: null, distinct_users_90d: 0, seal_valid_until: null, call_ready_valid_until: null,
  lat: -23.966, lng: -46.333, neighborhood: "Gonzaga", opening_hours: null,
};

describe("Modo chamada", () => {
  it("uses the call-ready seal, or measured ≥ 15 Mbps with noise ≥ 3", () => {
    expect(isCallMode({ ...base, call_ready_valid_until: daysAgo(-10) }, NOW)).toBe(true);
    expect(isCallMode({ ...base, wifi_source: "user_test", wifi_mbps: 20, quiet_level: 3 }, NOW)).toBe(true);
    expect(isCallMode({ ...base, wifi_source: "user_test", wifi_mbps: 20, quiet_level: 2 }, NOW)).toBe(false);
    // a declared number never qualifies
    expect(isCallMode({ ...base, wifi_source: "partner", wifi_mbps: 300, quiet_level: 5 }, NOW)).toBe(false);
  });
});

describe("Dados recentes", () => {
  it("keeps fresh and aging data only", () => {
    const fact = (d: number, out = 0) => ({ source: "user" as const, observed_at: daysAgo(d), confirmations_90d: 2, outdated_30d: out });
    expect(isRecent(fact(10), NOW)).toBe(true);
    expect(isRecent(fact(80), NOW)).toBe(true);
    expect(isRecent(fact(100), NOW)).toBe(false);
    expect(isRecent(fact(5, 2), NOW)).toBe(false);
    expect(isRecent(null, NOW)).toBe(false);
  });
});

describe("passesRadarFilters", () => {
  const quietWithOutlets = { ...base, quiet_level: 4, outlets_level: "few" as const };
  it("combines filters", () => {
    expect(passesRadarFilters(quietWithOutlets, ["quiet", "outlets"], { now: NOW })).toBe(true);
    expect(passesRadarFilters({ ...quietWithOutlets, outlets_level: "none" }, ["outlets"], { now: NOW })).toBe(false);
    expect(passesRadarFilters(base, ["quiet"], { now: NOW })).toBe(false);
  });
  it("'Perto de mim' uses the position in memory, or the chosen neighborhood", () => {
    expect(passesRadarFilters(base, ["near"], { now: NOW, near: { lat: -23.967, lng: -46.334 } })).toBe(true);
    expect(passesRadarFilters(base, ["near"], { now: NOW, near: { lat: -23.93, lng: -46.33 } })).toBe(false);
    expect(passesRadarFilters(base, ["near"], { now: NOW, neighborhood: "Boqueirão" })).toBe(false);
    expect(passesRadarFilters(base, ["near"], { now: NOW, neighborhood: "Gonzaga" })).toBe(true);
  });
  it("'Agora' needs interpretable opening hours that say open", () => {
    expect(passesRadarFilters(base, ["now"], { now: NOW, isOpen: () => null })).toBe(false);
    expect(passesRadarFilters(base, ["now"], { now: NOW, isOpen: () => true })).toBe(true);
  });
});

describe("radarInput", () => {
  it("only counts measured download and maps legacy outlets", () => {
    expect(radarInput({ ...base, wifi_source: "partner", wifi_mbps: 100, has_power_outlets: true }).download_mbps).toBeNull();
    expect(radarInput({ ...base, has_power_outlets: true }).outlets).toBe("few");
  });
});
