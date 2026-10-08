import { describe, expect, it } from "vitest";
import { bboxToOverpass, haversine, isInsideBBox, type BBox } from "./geo";

describe("haversine", () => {
  it("is zero for the same point", () => {
    expect(haversine({ lat: -27.6, lng: -48.5 }, { lat: -27.6, lng: -48.5 })).toBe(0);
  });

  it("measures one degree of latitude as ~111 km", () => {
    const d = haversine({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d).toBeGreaterThan(111_000);
    expect(d).toBeLessThan(111_400);
  });
});

describe("bbox helpers", () => {
  const bbox: BBox = [-48.62, -27.85, -48.33, -27.38];

  it("detects points inside and outside", () => {
    expect(isInsideBBox({ lat: -27.5954, lng: -48.548 }, bbox)).toBe(true);
    expect(isInsideBBox({ lat: -23.55, lng: -46.63 }, bbox)).toBe(false);
  });

  it("formats for Overpass as south,west,north,east", () => {
    expect(bboxToOverpass(bbox)).toBe("-27.85,-48.62,-27.38,-48.33");
  });
});
