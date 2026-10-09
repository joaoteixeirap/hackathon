import { describe, expect, it } from "vitest";
import { radarScore, rankForRadar, type RadarInput } from "./radarScore";

const NOW = Date.parse("2026-10-09T15:00:00Z");
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString();

const full: RadarInput = {
  download_mbps: 50, jitter_ms: 0, loss_pct: 0, outlets: "many", noise: 5, call_ok_share: 1,
  stay_policy: "free", last_verified_at: daysAgo(3), distinct_users_90d: 5,
};

describe("radarScore", () => {
  it("a perfect place scores 100 with high confidence", () => {
    const s = radarScore(full, NOW);
    expect(s.total).toBe(100);
    expect(s.confidence).toBe("high");
  });

  it("caps download at 50 Mbps and discounts unstable connections", () => {
    expect(radarScore({ ...full, download_mbps: 200 }, NOW).parts.connection.points).toBe(40);
    expect(radarScore({ ...full, download_mbps: 25 }, NOW).parts.connection.points).toBe(20);
    // 5% loss and 50 ms jitter → stability 0
    expect(radarScore({ ...full, loss_pct: 5, jitter_ms: 50 }, NOW).parts.connection.points).toBe(0);
    expect(radarScore({ ...full, loss_pct: 2.5 }, NOW).parts.connection.points).toBe(30);
  });

  it("missing data counts 0 and is flagged unknown (it invites to measure)", () => {
    const s = radarScore({ download_mbps: null, jitter_ms: null, loss_pct: null, outlets: null, noise: null, call_ok_share: null, stay_policy: "unknown", last_verified_at: null, distinct_users_90d: 0 }, NOW);
    expect(s.total).toBe(0);
    expect(Object.values(s.parts).every((p) => !p.known && p.points === 0)).toBe(true);
    expect(s.confidence).toBe("low");
  });

  it("applies the table for outlets, noise, stay and freshness", () => {
    expect(radarScore({ ...full, outlets: "few" }, NOW).parts.outlets.points).toBe(8);
    expect(radarScore({ ...full, noise: 3 }, NOW).parts.noise.points).toBe(7.5);
    expect(radarScore({ ...full, stay_policy: "time_limit" }, NOW).parts.stay.points).toBe(1);
    expect(radarScore({ ...full, last_verified_at: daysAgo(45) }, NOW).parts.freshness.points).toBe(6);
    expect(radarScore({ ...full, last_verified_at: daysAgo(75) }, NOW).parts.freshness.points).toBe(3);
    expect(radarScore({ ...full, last_verified_at: daysAgo(120) }, NOW).parts.freshness.points).toBe(0);
    expect(radarScore({ ...full, distinct_users_90d: 3 }, NOW).confidence).toBe("medium");
  });
});

describe("I3: sponsorship never changes the Radar", () => {
  it("two identical places, one sponsored, get the same score and keep their order", () => {
    const base = { last_verified_at: daysAgo(3), score: radarScore(full, NOW) };
    const plain = { ...base, name: "Café A", featured_until: null as string | null, partner_plan: "free" };
    const sponsored = { ...base, name: "Café B", featured_until: daysAgo(-30), partner_plan: "destaque" };
    expect(radarScore({ ...full, ...({ featured_until: daysAgo(-30) } as object) } as RadarInput, NOW)).toEqual(radarScore(full, NOW));
    expect(rankForRadar([sponsored, plain]).map((p) => p.name)).toEqual(["Café A", "Café B"]);
    expect(rankForRadar([plain, sponsored]).map((p) => p.name)).toEqual(["Café A", "Café B"]);
  });
});
