import { describe, expect, it } from "vitest";
import { classifyFreshness, factLine, isCallReady, isSealActive, placeFreshness, sealStatus } from "./trust";

const NOW = Date.parse("2026-10-09T15:00:00Z");
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString();
const inDays = (n: number) => new Date(NOW + n * 86_400_000).toISOString();

describe("seals with validity (R3)", () => {
  it("a seal is active until its date and then shows as expired", () => {
    // last qualifying check-in 59 days ago → valid until tomorrow
    const place = { seal_valid_until: inDays(1), call_ready_valid_until: null };
    expect(isSealActive(place, NOW)).toBe(true);
    expect(sealStatus(place, NOW)).toBe("active");
    // 61 days after the check-in: expired, no job needed
    expect(isSealActive(place, NOW + 2 * 86_400_000)).toBe(false);
    expect(sealStatus(place, NOW + 2 * 86_400_000)).toBe("expired");
  });
  it("places that never had a seal show none", () => {
    expect(sealStatus({ seal_valid_until: null }, NOW)).toBe("none");
    expect(isCallReady({ seal_valid_until: null, call_ready_valid_until: null }, NOW)).toBe(false);
    expect(isCallReady({ seal_valid_until: null, call_ready_valid_until: inDays(10) }, NOW)).toBe(true);
  });
});

describe("classifyFreshness (T2)", () => {
  it("uses the 30 / 90 day limits", () => {
    expect(classifyFreshness(daysAgo(30), 0, NOW)).toBe("fresh");
    expect(classifyFreshness(daysAgo(31), 0, NOW)).toBe("aging");
    expect(classifyFreshness(daysAgo(90), 0, NOW)).toBe("aging");
    expect(classifyFreshness(daysAgo(91), 0, NOW)).toBe("stale");
  });
  it("two 'desatualizado' votes make even recent data stale; no date is unknown", () => {
    expect(classifyFreshness(daysAgo(3), 2, NOW)).toBe("stale");
    expect(classifyFreshness(daysAgo(3), 1, NOW)).toBe("fresh");
    expect(classifyFreshness(null, 0, NOW)).toBe("unknown");
  });
  it("place freshness follows the Wi-Fi fact", () => {
    expect(placeFreshness({ wifi: { source: "user", observed_at: daysAgo(70), confirmations_90d: 2, outdated_30d: 0 } }, NOW)).toBe("aging");
    expect(placeFreshness({}, NOW)).toBe("unknown");
  });
});

describe("factLine (T1)", () => {
  it("says source, when and how many people", () => {
    expect(factLine({ source: "user", observed_at: daysAgo(12), confirmations_90d: 3, outdated_30d: 0 }, { now: NOW })).toBe(
      "Medido por nômades · verificado há 12 dias por 3 pessoas",
    );
    expect(factLine({ source: "user", observed_at: daysAgo(0), confirmations_90d: 1, outdated_30d: 0 }, { now: NOW, measured: false })).toBe(
      "Relatado por nômades · verificado hoje por 1 pessoa",
    );
    expect(factLine({ source: "partner", observed_at: daysAgo(40), confirmations_90d: 0, outdated_30d: 0 }, { now: NOW })).toBe(
      "Declarado pelo local · há 1 mês",
    );
  });
  it("OpenStreetMap shows the import date; missing data invites to verify", () => {
    expect(factLine({ source: "osm", observed_at: "2026-10-08T12:00:00Z", confirmations_90d: 0, outdated_30d: 0 })).toBe(
      "OpenStreetMap (importado em 08/10)",
    );
    expect(factLine(undefined)).toBe("Sem verificação ainda");
  });
});

describe("factLineShort", () => {
  it("is a compact line for the Radar", async () => {
    const { factLineShort } = await import("./trust");
    const NOW2 = Date.parse("2026-10-09T15:00:00Z");
    expect(factLineShort({ source: "user", observed_at: new Date(NOW2 - 2 * 86_400_000).toISOString(), confirmations_90d: 2, outdated_30d: 0 }, NOW2)).toBe("nômades · há 2 dias · 2 pessoas");
    expect(factLineShort({ source: "partner", observed_at: new Date(NOW2).toISOString(), confirmations_90d: 0, outdated_30d: 0 }, NOW2)).toBe("local · hoje");
    expect(factLineShort(undefined)).toBe("sem verificação");
  });
});
