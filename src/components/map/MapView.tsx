"use client";

import maplibregl, { type StyleSpecification } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import type { City } from "@/lib/cities";
import { applyTheme, type MapTheme } from "./applyTheme";

const STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/liberty";

function usePreferredTheme(): MapTheme {
  const [theme, setTheme] = useState<MapTheme>("day");
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setTheme(mq.matches ? "night" : "day");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return theme;
}

export function MapView({ city }: { city: City }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const baseStyleRef = useRef<StyleSpecification | null>(null);
  const theme = usePreferredTheme();
  // The style fetch resolves after the theme is detected; read the latest value at creation.
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    fetch(STYLE_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`style ${r.status}`);
        return r.json() as Promise<StyleSpecification>;
      })
      .then((style) => {
        if (cancelled || !containerRef.current) return;
        baseStyleRef.current = style;
        const [west, south, east, north] = city.bbox;
        const map = new maplibregl.Map({
          container: containerRef.current,
          style: applyTheme(style, themeRef.current),
          center: [city.center_lng, city.center_lat],
          zoom: city.zoom,
          maxBounds: [
            [west, south],
            [east, north],
          ],
          maxZoom: 18,
          attributionControl: { compact: true },
          dragRotate: false,
          pitchWithRotate: false,
        });
        map.touchZoomRotate.disableRotation();
        map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
        map.once("load", () => containerRef.current?.setAttribute("data-map-ready", "true"));
        mapRef.current = map;
      })
      .catch(() => !cancelled && setError(true));

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [city]);

  useEffect(() => {
    const map = mapRef.current;
    const base = baseStyleRef.current;
    if (map && base) map.setStyle(applyTheme(base, theme));
  }, [theme]);

  return (
    <div className="absolute inset-0">
      <div
        ref={containerRef}
        // Inline style: maplibre-gl.css sets `.maplibregl-map { position: relative }`,
        // which beats Tailwind's layered utilities and would collapse the map to 0 px.
        style={{ position: "absolute", inset: 0 }}
        role="region"
        aria-label={`Mapa de ${city.name}`}
      />
      <div className="paper-grain" aria-hidden />
      {error && (
        <p className="absolute inset-x-4 top-1/2 rounded-2xl bg-papel-claro p-4 text-center text-tinta shadow">
          Não foi possível carregar o mapa. Verifique sua conexão.
        </p>
      )}
    </div>
  );
}
