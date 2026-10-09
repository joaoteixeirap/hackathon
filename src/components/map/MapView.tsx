"use client";

import maplibregl, {
  type ExpressionSpecification,
  type GeoJSONSource,
  type MapLayerMouseEvent,
  type StyleSpecification,
} from "maplibre-gl";
import type { Feature, FeatureCollection, LineString, Point } from "geojson";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { City } from "@/lib/cities";
import type { ActivitySummary, PlaceCategory, PlaceSummary } from "@/lib/places";
import { createActivityMarker } from "./activityMarker";
import { createPresenceMarker, type PresenceSpot } from "./presenceMarker";
import { applyTheme, type MapTheme } from "./applyTheme";
import { addPinImages, CATEGORY_HEX, pinIconKey } from "./pins";
import { loadBaseStyle } from "./style";


const CATS: PlaceCategory[] = ["work", "eat", "health", "stay", "tour", "service"];

export type MapViewState = {
  bounds: [number, number, number, number]; // west, south, east, north
  center: { lat: number; lng: number };
  zoom: number;
};

export type MapViewHandle = {
  recenter: () => void;
  flyTo: (lat: number, lng: number, zoom?: number) => void;
};

type Props = {
  city: City;
  theme: MapTheme;
  places: PlaceSummary[];
  activities: ActivitySummary[];
  selectedPlaceId: string | null;
  /** Share of the viewport covered by the sheet, so flyTo targets stay above it. */
  sheetFraction: number;
  leftInset: number;
  onSelectPlace: (id: string | null) => void;
  onSelectActivity: (id: string) => void;
  onViewChange: (view: MapViewState) => void;
  onReady?: () => void;
  /** "Rota do dia" stops, in order (F9). */
  route?: { lat: number; lng: number }[];
  /** "Quem está aqui" spots, already aggregated (F8). */
  presence?: PresenceSpot[];
};

function routeGeoJSON(stops: { lat: number; lng: number }[]): FeatureCollection {
  const features: Feature[] = stops.map((s, i) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [s.lng, s.lat] } as Point,
    properties: { n: String(i + 1) },
  }));
  if (stops.length >= 2) {
    features.unshift({
      type: "Feature",
      geometry: { type: "LineString", coordinates: stops.map((s) => [s.lng, s.lat]) } as LineString,
      properties: {},
    });
  }
  return { type: "FeatureCollection", features };
}

/** Route line under the pins, numbered stops above them. */
function installRouteLayers(map: maplibregl.Map, theme: MapTheme) {
  if (map.getSource("route")) return;
  const line = theme === "day" ? "#0B3B4A" : "#6CC3D1";
  const surface = theme === "day" ? "#FFFFFF" : "#162027";
  const onLine = theme === "day" ? "#FFFFFF" : "#0D1418";
  map.addSource("route", { type: "geojson", data: routeGeoJSON([]) });
  map.addLayer(
    {
      id: "route-casing",
      type: "line",
      source: "route",
      filter: ["==", ["geometry-type"], "LineString"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": surface, "line-width": 8 },
    },
    "cluster-halo",
  );
  map.addLayer(
    {
      id: "route-line",
      type: "line",
      source: "route",
      filter: ["==", ["geometry-type"], "LineString"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": line, "line-width": 4, "line-dasharray": [1.5, 1.2] },
    },
    "cluster-halo",
  );
  map.addLayer({
    id: "route-stop",
    type: "circle",
    source: "route",
    filter: ["==", ["geometry-type"], "Point"],
    paint: { "circle-color": line, "circle-radius": 11, "circle-stroke-color": surface, "circle-stroke-width": 2.5, "circle-translate": [0, 10] },
  });
  map.addLayer({
    id: "route-stop-n",
    type: "symbol",
    source: "route",
    filter: ["==", ["geometry-type"], "Point"],
    layout: { "text-field": ["get", "n"], "text-font": ["Noto Sans Bold"], "text-size": 12, "text-allow-overlap": true, "text-offset": [0, 0.85] },
    paint: { "text-color": onLine },
  });
}

function toGeoJSON(places: PlaceSummary[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: places.map((p) => ({
      type: "Feature",
      id: p.id,
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      properties: {
        id: p.id,
        category: p.category,
        icon: pinIconKey(p.category, p.subcategory, p.nomad_seal),
        featured: p.featured,
        name: p.name,
      },
    })),
  };
}

/** Ring color of a cluster = its dominant category. */
function dominantColor(theme: MapTheme): ExpressionSpecification {
  const branches: (ExpressionSpecification | string)[] = [];
  for (const c of CATS) {
    const others = CATS.filter((o) => o !== c).map(
      (o) => [">=", ["get", c], ["get", o]] as ExpressionSpecification,
    );
    branches.push(["all", ...others] as ExpressionSpecification, CATEGORY_HEX[theme][c]);
  }
  return ["case", ...branches, CATEGORY_HEX[theme].service] as unknown as ExpressionSpecification;
}

async function installLayers(map: maplibregl.Map, theme: MapTheme, data: FeatureCollection) {
  await addPinImages(map, theme);
  if (map.getSource("places")) return;

  const ink = theme === "day" ? "#0F1F2A" : "#EDF1F3";
  const surface = theme === "day" ? "#FFFFFF" : "#162027";
  const clusterFill = theme === "day" ? "#0B3B4A" : "#6CC3D1";
  const clusterText = theme === "day" ? "#FFFFFF" : "#0D1418";

  map.addSource("places", {
    type: "geojson",
    data,
    cluster: true,
    clusterMaxZoom: 15,
    clusterRadius: 46,
    clusterProperties: Object.fromEntries(
      CATS.map((c) => [c, ["+", ["case", ["==", ["get", "category"], c], 1, 0]]]),
    ),
  });

  // Clusters: brand-dark disc, white rim, soft halo in the dominant category color.
  map.addLayer({
    id: "cluster-halo",
    type: "circle",
    source: "places",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": dominantColor(theme),
      "circle-opacity": 0.22,
      "circle-radius": ["step", ["get", "point_count"], 24, 10, 29, 50, 35],
    },
  });
  map.addLayer({
    id: "cluster-ring",
    type: "circle",
    source: "places",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": clusterFill,
      "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 50, 25],
      "circle-stroke-width": 2.5,
      "circle-stroke-color": surface,
    },
  });
  map.addLayer({
    id: "cluster-count",
    type: "symbol",
    source: "places",
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": ["Noto Sans Bold"],
      "text-size": 13,
      "text-allow-overlap": true,
    },
    paint: { "text-color": clusterText },
  });
  map.addLayer({
    id: "place-featured-halo",
    type: "circle",
    source: "places",
    filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "featured"], true]],
    paint: {
      "circle-color": "#FF5B3A",
      "circle-opacity": 0.28,
      "circle-blur": 0.5,
      "circle-radius": 24,
      "circle-translate": [0, -26],
    },
  });
  map.addLayer({
    id: "place-pin",
    type: "symbol",
    source: "places",
    filter: ["!", ["has", "point_count"]],
    layout: {
      "icon-image": ["get", "icon"],
      "icon-anchor": "bottom",
      "icon-size": ["case", ["==", ["get", "featured"], true], 1.2, 1],
      "icon-allow-overlap": true,
      "symbol-sort-key": ["case", ["==", ["get", "featured"], true], 1, 0],
    },
  });
  map.addLayer({
    id: "place-selected",
    type: "symbol",
    source: "places",
    filter: ["==", ["get", "id"], ""],
    layout: {
      "icon-image": ["get", "icon"],
      "icon-anchor": "bottom",
      "icon-size": 1.45,
      "icon-allow-overlap": true,
      "text-field": ["get", "name"],
      "text-font": ["Noto Sans Bold"],
      "text-size": 13,
      "text-anchor": "top",
      "text-offset": [0, 0.4],
      "text-optional": true,
    },
    paint: { "text-color": ink, "text-halo-color": surface, "text-halo-width": 2 },
  });
}

const NO_STOPS: { lat: number; lng: number }[] = [];
const NO_PRESENCE: PresenceSpot[] = [];

export const MapView = forwardRef<MapViewHandle, Props>(function MapView(
  { city, theme, places, activities, selectedPlaceId, sheetFraction, leftInset, onSelectPlace, onSelectActivity, onViewChange, onReady, route = NO_STOPS, presence = NO_PRESENCE },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const baseStyleRef = useRef<StyleSpecification | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const presenceRef = useRef<maplibregl.Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  // Latest values for map callbacks registered once.
  const latest = useRef({ theme, places, route, selectedPlaceId, sheetFraction, leftInset, onSelectPlace, onSelectActivity, onViewChange, onReady });
  latest.current = { theme, places, route, selectedPlaceId, sheetFraction, leftInset, onSelectPlace, onSelectActivity, onViewChange, onReady };

  useImperativeHandle(ref, () => ({
    recenter() {
      mapRef.current?.flyTo({ center: [city.center_lng, city.center_lat], zoom: city.zoom, bearing: 0 });
    },
    flyTo(lat, lng, zoom) {
      const map = mapRef.current;
      if (!map) return;
      map.easeTo({
        center: [lng, lat],
        zoom: Math.max(map.getZoom(), zoom ?? 15),
        padding: { top: 0, bottom: Math.round(window.innerHeight * latest.current.sheetFraction), left: latest.current.leftInset, right: 0 },
        duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 600,
      });
    },
  }));

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    const emitView = (map: maplibregl.Map) => {
      const b = map.getBounds();
      const c = map.getCenter();
      latest.current.onViewChange({
        bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
        center: { lat: c.lat, lng: c.lng },
        zoom: map.getZoom(),
      });
    };

    loadBaseStyle()
      .then((style) => {
        if (cancelled || !containerRef.current) return;
        baseStyleRef.current = style;
        const [west, south, east, north] = city.bbox;
        const map = new maplibregl.Map({
          container: containerRef.current,
          style: applyTheme(style, latest.current.theme),
          center: [city.center_lng, city.center_lat],
          zoom: city.zoom,
          maxBounds: [
            [west - 0.02, south - 0.02],
            [east + 0.02, north + 0.02],
          ],
          maxZoom: 18,
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
        });
        map.touchZoomRotate.disableRotation();
        map.addControl(new maplibregl.ScaleControl({ unit: "metric", maxWidth: 110 }), "bottom-left");
        map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
        mapRef.current = map;

        map.on("style.load", () => {
          installLayers(map, latest.current.theme, toGeoJSON(latest.current.places)).then(() => {
            if (cancelled) return;
            const src = map.getSource("places") as GeoJSONSource | undefined;
            src?.setData(toGeoJSON(latest.current.places));
            installRouteLayers(map, latest.current.theme);
            (map.getSource("route") as GeoJSONSource | undefined)?.setData(routeGeoJSON(latest.current.route));
            map.setFilter("place-selected", ["==", ["get", "id"], latest.current.selectedPlaceId ?? ""]);
            setReady(true);
            containerRef.current?.setAttribute("data-map-ready", "true");
            latest.current.onReady?.();
          });
        });

        map.on("click", "place-pin", (e: MapLayerMouseEvent) => {
          const id = e.features?.[0]?.properties?.id as string | undefined;
          if (id) latest.current.onSelectPlace(id);
        });
        map.on("click", "cluster-ring", async (e: MapLayerMouseEvent) => {
          const feature = e.features?.[0];
          if (!feature) return;
          const src = map.getSource("places") as GeoJSONSource;
          const zoom = await src.getClusterExpansionZoom(feature.properties?.cluster_id as number);
          map.easeTo({ center: (feature.geometry as Point).coordinates as [number, number], zoom });
        });
        map.on("click", (e) => {
          const hits = map.queryRenderedFeatures(e.point, { layers: ["place-pin", "cluster-ring"] });
          if (hits.length === 0) latest.current.onSelectPlace(null);
        });
        for (const layer of ["place-pin", "cluster-ring"]) {
          map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
          map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
        }
        map.on("moveend", () => emitView(map));
        map.once("load", () => {
          emitView(map);
          containerRef.current
            ?.querySelector(".maplibregl-ctrl-attrib")
            ?.classList.remove("maplibregl-compact-show");
        });
      })
      .catch(() => !cancelled && setError(true));

    return () => {
      cancelled = true;
      for (const m of [...markersRef.current, ...presenceRef.current]) m.remove();
      markersRef.current = [];
      presenceRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [city]);

  // Theme: swap the base style; layers and images are reinstalled on style.load.
  useEffect(() => {
    const map = mapRef.current;
    const base = baseStyleRef.current;
    if (!map || !base) return;
    setReady(false);
    map.setStyle(applyTheme(base, theme), { diff: false });
  }, [theme]);

  useEffect(() => {
    const src = mapRef.current?.getSource("places") as GeoJSONSource | undefined;
    if (ready && src) src.setData(toGeoJSON(places));
  }, [places, ready]);

  useEffect(() => {
    if (ready) mapRef.current?.setFilter("place-selected", ["==", ["get", "id"], selectedPlaceId ?? ""]);
  }, [selectedPlaceId, ready]);

  useEffect(() => {
    const src = mapRef.current?.getSource("route") as GeoJSONSource | undefined;
    if (ready && src) src.setData(routeGeoJSON(route));
  }, [route, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const m of presenceRef.current) m.remove();
    presenceRef.current = presence.map((p) =>
      new maplibregl.Marker({ element: createPresenceMarker(p), anchor: "center" }).setLngLat([p.lng, p.lat]).addTo(map),
    );
  }, [presence, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const m of markersRef.current) m.remove();
    markersRef.current = activities.map((a) =>
      new maplibregl.Marker({ element: createActivityMarker(a, (id) => latest.current.onSelectActivity(id)), anchor: "center" })
        .setLngLat([a.lng, a.lat])
        .addTo(map),
    );
  }, [activities, ready]);

  return (
    <>
      <div
        ref={containerRef}
        // Inline style: maplibre-gl.css sets `.maplibregl-map { position: relative }`,
        // which beats Tailwind's layered utilities and would collapse the map to 0 px.
        style={{ position: "absolute", inset: 0 }}
        role="region"
        aria-label={`Mapa de ${city.name}`}
      />
      {error && (
        <p className="absolute inset-x-4 top-1/2 z-10 rounded-2xl bg-surface p-4 text-center text-ink shadow">
          Não foi possível carregar o mapa. Verifique sua conexão.
        </p>
      )}
    </>
  );
});
