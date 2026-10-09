"use client";

import maplibregl from "maplibre-gl";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { applyTheme } from "@/components/map/applyTheme";
import { loadBaseStyle } from "@/components/map/style";
import type { BBox } from "@/lib/geo";

type Pin = { id: string; name: string; lat: number; lng: number };

/** Radar as a map: only the filtered places, numbered by their position in the list. */
export function RadarMap({ pins, bbox, center, zoom }: { pins: Pin[]; bbox: BBox; center: { lat: number; lng: number }; zoom: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!ref.current) return;
    let map: maplibregl.Map | null = null;
    let cancelled = false;
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const forced = document.documentElement.getAttribute("data-theme");
    const theme = forced === "night" || (forced !== "day" && dark) ? "night" : "day";

    loadBaseStyle().then((style) => {
      if (cancelled || !ref.current) return;
      const [w, s, e, n] = bbox;
      map = new maplibregl.Map({
        container: ref.current,
        style: applyTheme(style, theme),
        center: [center.lng, center.lat],
        zoom,
        maxBounds: [
          [w - 0.02, s - 0.02],
          [e + 0.02, n + 0.02],
        ],
        attributionControl: false,
        dragRotate: false,
      });
      map.touchZoomRotate.disableRotation();
      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
      pins.forEach((p, i) => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "radar-pin";
        el.textContent = String(i + 1);
        el.setAttribute("aria-label", `${i + 1}. ${p.name}`);
        el.addEventListener("click", () => router.push(`/lugar/${p.id}`));
        new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([p.lng, p.lat]).addTo(map!);
      });
      if (pins.length > 1) {
        const b = new maplibregl.LngLatBounds();
        for (const p of pins) b.extend([p.lng, p.lat]);
        map.fitBounds(b, { padding: 48, maxZoom: 15, duration: 0 });
      }
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [pins, bbox, center, zoom, router]);

  return <div ref={ref} className="h-[60dvh] min-h-80 w-full overflow-hidden rounded-3xl border border-line" role="region" aria-label="Mapa do Radar" />;
}
