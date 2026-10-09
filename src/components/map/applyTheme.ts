import type { LayerSpecification, StyleSpecification } from "maplibre-gl";

export type MapTheme = "day" | "night";

type Palette = {
  land: string;
  water: string;
  waterLine: string;
  green: string;
  road: string;
  roadCasing: string;
  building: string;
  label: string;
  halo: string;
};

// DESIGN.md §4: a quiet, neutral basemap so brand pins carry the color.
const PALETTES: Record<MapTheme, Palette> = {
  day: {
    land: "#F2EFEA",
    water: "#BFDDEA",
    waterLine: "#A9CFE0",
    green: "#D5E7CC",
    road: "#FFFFFF",
    roadCasing: "rgba(15, 31, 42, 0.10)",
    building: "#E7E2DA",
    label: "#4A5761",
    halo: "#FFFFFF",
  },
  night: {
    land: "#121A1F",
    water: "#0C2733",
    waterLine: "#123545",
    green: "#14251E",
    road: "#24303A",
    roadCasing: "rgba(237, 241, 243, 0.06)",
    building: "#1A242B",
    label: "#9FADB6",
    halo: "#121A1F",
  },
};

const isMajorRoad = (id: string) => /motorway|trunk|primary/.test(id);

function themeLayer(layer: LayerSpecification, p: Palette): LayerSpecification | null {
  const id = layer.id;
  const src = "source-layer" in layer ? layer["source-layer"] : undefined;

  // Our own pins replace the base style's POIs; hillshade raster and 3D buildings are noise.
  if (src === "poi" || id === "natural_earth" || layer.type === "fill-extrusion") return null;

  switch (layer.type) {
    case "background":
      return { ...layer, paint: { "background-color": p.land } };
    case "fill": {
      if (src === "water") {
        return { ...layer, paint: { "fill-color": p.water, "fill-outline-color": p.waterLine } };
      }
      if (src === "park" || id.startsWith("landcover_wood") || id.startsWith("landcover_grass") || id === "landcover_wetland" || id === "landuse_pitch") {
        return { ...layer, paint: { "fill-color": p.green, "fill-opacity": 0.7 } };
      }
      if (src === "building") {
        return { ...layer, paint: { "fill-color": p.building } };
      }
      if (src === "landuse" || src === "landcover" || src === "aeroway") {
        return { ...layer, paint: { "fill-color": p.land, "fill-opacity": 0.6 } };
      }
      if (id === "road_area_pattern") return null;
      return layer;
    }
    case "line": {
      if (src === "waterway") {
        return { ...layer, paint: { ...layer.paint, "line-color": p.water } };
      }
      if (id === "park_outline") return null;
      if (src === "transportation" || src === "aeroway") {
        if (/rail/.test(id)) {
          return { ...layer, paint: { ...layer.paint, "line-color": p.roadCasing } };
        }
        if (id.endsWith("_casing")) {
          const color = isMajorRoad(id) ? p.roadCasing.replace(/0\.\d+\)$/, "0.22)") : p.roadCasing;
          return { ...layer, paint: { ...layer.paint, "line-color": color } };
        }
        return { ...layer, paint: { ...layer.paint, "line-color": p.road } };
      }
      if (src === "boundary") {
        return { ...layer, paint: { ...layer.paint, "line-color": p.roadCasing } };
      }
      return layer;
    }
    case "symbol": {
      if (/shield/.test(id) || id.startsWith("road_one_way")) return null;
      return {
        ...layer,
        paint: {
          ...layer.paint,
          "text-color": p.label,
          "text-halo-color": p.halo,
          "text-halo-width": 1.5,
        },
      };
    }
    default:
      return layer;
  }
}

/** Recolors a vector style (OpenFreeMap "liberty" layer ids) into the SoloRota basemap. */
export function applyTheme(style: StyleSpecification, theme: MapTheme): StyleSpecification {
  const p = PALETTES[theme];
  const layers = style.layers
    .map((l) => themeLayer(l, p))
    .filter((l): l is LayerSpecification => l !== null);
  return { ...style, layers };
}
