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

// DESIGN.md §2 and §4.
const PALETTES: Record<MapTheme, Palette> = {
  day: {
    land: "#F3EAD7",
    water: "#9CC9C3",
    waterLine: "#1E5B66",
    green: "#B9CDA0",
    road: "#FFFDF6",
    roadCasing: "rgba(31, 42, 48, 0.15)",
    building: "#E7DCC3",
    label: "#1F2A30",
    halo: "#F3EAD7",
  },
  night: {
    land: "#0F1E26",
    water: "#0B3A42",
    waterLine: "#2A7380",
    green: "#1D3A33",
    road: "#1C3038",
    roadCasing: "rgba(237, 229, 210, 0.15)",
    building: "#172A33",
    label: "#EDE5D2",
    halo: "#0F1E26",
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
          const color = isMajorRoad(id) ? p.roadCasing.replace("0.15", "0.35") : p.roadCasing;
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
          "text-halo-width": 1.25,
        },
      };
    }
    default:
      return layer;
  }
}

/** Recolors a vector style (OpenFreeMap "liberty" layer ids) into the "Carta Tropical" look. */
export function applyTheme(style: StyleSpecification, theme: MapTheme): StyleSpecification {
  const p = PALETTES[theme];
  const layers = style.layers
    .map((l) => themeLayer(l, p))
    .filter((l): l is LayerSpecification => l !== null);
  return { ...style, layers };
}
