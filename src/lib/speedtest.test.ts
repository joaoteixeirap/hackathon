import { describe, expect, it } from "vitest";
import { jitter, lossPct, mbps, median, summarize } from "./speedtest";

describe("speedtest statistics", () => {
  it("median of odd, even and empty series", () => {
    expect(median([30, 10, 20])).toBe(20);
    expect(median([10, 40, 20, 30])).toBe(25);
    expect(median([])).toBeNull();
  });

  it("jitter is the mean absolute difference between consecutive successful pings", () => {
    expect(jitter([20, 30, 25, 35])).toBeCloseTo((10 + 5 + 10) / 3);
    // failures are skipped, not treated as zero
    expect(jitter([20, null, 30])).toBe(10);
    expect(jitter([20])).toBeNull();
  });

  it("loss counts failures over all attempts", () => {
    expect(lossPct([10, null, 12, null, 11, 10, 10, 10, 10, 10])).toBe(20);
    expect(lossPct([])).toBe(0);
  });

  it("converts bytes and time to Mbps", () => {
    expect(mbps(1_000_000, 1000)).toBe(8);
    expect(mbps(1, 0)).toBe(0);
  });

  it("summarizes a known run", () => {
    expect(summarize([20, 22, null, 24, 20, 21, 23, 22, 20, 21], [48.26, 51.9], [9.44])).toEqual({
      download_mbps: 50.1,
      upload_mbps: 9.4,
      ping_ms: 21,
      jitter_ms: 1.9,
      loss_pct: 10,
    });
  });
});
