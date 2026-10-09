import { describe, expect, it } from "vitest";
import { parseCheckin, trustErrorMessage } from "./checkin";

const PLACE = "00000000-0000-4000-8000-0000000000c1";

describe("parseCheckin", () => {
  it("accepts a measured check-in with a quick report and rounds numbers", () => {
    const r = parseCheckin({
      place_id: PLACE, download_mbps: 48.26, upload_mbps: 9.44, ping_ms: 21.04, jitter_ms: 1.875, loss_pct: 10,
      on_venue_wifi: true, near_place: true, outlets_level: "many", noise_level: 4, call_result: "ok", stay_policy: "free", comment: "  bom  ",
    });
    expect(r).toEqual({
      ok: true,
      data: {
        place_id: PLACE, activity_id: null, download_mbps: 48.3, upload_mbps: 9.4, ping_ms: 21, jitter_ms: 1.9, loss_pct: 10,
        on_venue_wifi: true, near_place: true, outlets_level: "many", noise_level: 4, call_result: "ok", stay_policy: "free", crowd_level: null, comment: "bom",
      },
    });
  });

  it("requires the venue Wi-Fi confirmation for measurements", () => {
    const r = parseCheckin({ place_id: PLACE, download_mbps: 50, on_venue_wifi: false, near_place: false });
    expect(r.ok).toBe(false);
  });

  it("accepts a report without measurement, but not an empty check-in", () => {
    expect(parseCheckin({ place_id: PLACE, on_venue_wifi: false, near_place: false, noise_level: 2 }).ok).toBe(true);
    expect(parseCheckin({ place_id: PLACE, on_venue_wifi: false, near_place: false }).ok).toBe(false);
  });

  it("rejects out-of-range or unknown values", () => {
    expect(parseCheckin({ place_id: PLACE, download_mbps: 9000, on_venue_wifi: true, near_place: false }).ok).toBe(false);
    expect(parseCheckin({ place_id: PLACE, on_venue_wifi: false, near_place: false, noise_level: 7 }).ok).toBe(false);
    expect(parseCheckin({ place_id: PLACE, on_venue_wifi: false, near_place: false, outlets_level: "lots" }).ok).toBe(false);
    expect(parseCheckin({ place_id: "x", on_venue_wifi: false, near_place: false, noise_level: 3 }).ok).toBe(false);
  });
});

describe("trustErrorMessage", () => {
  it("maps database errors", () => {
    expect(trustErrorMessage("checkin cooldown")).toMatch(/há pouco/);
    expect(trustErrorMessage("partners cannot vote on their own place")).toMatch(/próprio lugar/);
    expect(trustErrorMessage(undefined)).toMatch(/Tente de novo/);
  });
});
