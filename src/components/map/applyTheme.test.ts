import type { StyleSpecification } from "maplibre-gl";
import { describe, expect, it } from "vitest";
import { applyTheme } from "./applyTheme";

const style: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#fff" } },
    { id: "water", type: "fill", source: "x", "source-layer": "water" },
    { id: "poi_r1", type: "symbol", source: "x", "source-layer": "poi" },
    { id: "road_minor", type: "line", source: "x", "source-layer": "transportation" },
    { id: "building-3d", type: "fill-extrusion", source: "x", "source-layer": "building" },
  ],
};

describe("applyTheme", () => {
  it("paints land and water with the day basemap colors", () => {
    const out = applyTheme(style, "day");
    const bg = out.layers.find((l) => l.id === "background");
    const water = out.layers.find((l) => l.id === "water");
    expect(bg?.paint).toMatchObject({ "background-color": "#F2EFEA" });
    expect(water?.paint).toMatchObject({ "fill-color": "#BFDDEA" });
  });

  it("hides base POIs and 3D buildings", () => {
    const ids = applyTheme(style, "night").layers.map((l) => l.id);
    expect(ids).not.toContain("poi_r1");
    expect(ids).not.toContain("building-3d");
    expect(ids).toContain("road_minor");
  });
});
