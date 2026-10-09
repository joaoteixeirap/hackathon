import { describe, expect, it } from "vitest";
import { MIN_SAMPLE_MS, mbps, median, nextStep, validWifiResult } from "./wifi";

describe("mbps", () => {
  it("converts bytes over milliseconds to megabits per second", () => {
    expect(mbps(1_000_000, 1000)).toBe(8);
    expect(mbps(4 * 1024 * 1024, 500)).toBeCloseTo(67.1, 1);
    expect(mbps(100, 0)).toBe(0);
  });
});

describe("median", () => {
  it("handles odd, even and empty inputs", () => {
    expect(median([30, 10, 20])).toBe(20);
    expect(median([10, 40, 20, 30])).toBe(25);
    expect(median([])).toBeNull();
  });
});

describe("nextStep", () => {
  it("grows the sample while downloads are too quick to measure", () => {
    expect(nextStep(256 * 1024, 80, 300)).toBe(1024 * 1024);
    expect(nextStep(1024 * 1024, 200, 600)).toBe(4 * 1024 * 1024);
  });
  it("stops once a sample is long enough or there is no bigger step", () => {
    expect(nextStep(1024 * 1024, MIN_SAMPLE_MS, 2000)).toBeNull();
    expect(nextStep(8 * 1024 * 1024, 900, 3000)).toBeNull();
  });
  it("stops when the next step would blow the 12 s budget on a slow link", () => {
    // 1 MB took 1.4 s → 4 MB would take ~5.6 s; with 8 s already spent that is too much.
    expect(nextStep(1024 * 1024, 1400, 8000)).toBeNull();
  });
});

describe("validWifiResult", () => {
  it("rounds and accepts plausible values", () => {
    expect(validWifiResult("48.26", "23.6")).toEqual({ download_mbps: 48.3, ping_ms: 24 });
    expect(validWifiResult(12, null)).toEqual({ download_mbps: 12, ping_ms: null });
  });
  it("rejects zero, negative, absurd or non-numeric values", () => {
    expect(validWifiResult(0, 10)).toBeNull();
    expect(validWifiResult(20000, 10)).toBeNull();
    expect(validWifiResult("abc", 10)).toBeNull();
    expect(validWifiResult(50, -1)).toBeNull();
  });
});
