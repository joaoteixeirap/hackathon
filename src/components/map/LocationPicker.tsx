"use client";

import maplibregl, { type StyleSpecification } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import type { BBox } from "@/lib/geo";
import { applyTheme } from "./applyTheme";

const STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/liberty";

/**
 * Pan-to-pick: the meeting point is the map center, marked by a fixed crosshair pin.
 * Works with one thumb and needs no precise tap on a small target.
 */
export function LocationPicker({
  bbox,
  initial,
  zoom = 15,
  onChange,
}: {
  bbox: BBox;
  initial: { lat: number; lng: number };
  zoom?: number;
  onChange: (p: { lat: number; lng: number }) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    let map: maplibregl.Map | null = null;
    let cancelled = false;
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const forced = document.documentElement.getAttribute("data-theme");
    const theme = forced === "night" || (forced !== "day" && dark) ? "night" : "day";

    fetch(STYLE_URL)
      .then((r) => r.json() as Promise<StyleSpecification>)
      .then((style) => {
        if (cancelled || !ref.current) return;
        map = new maplibregl.Map({
          container: ref.current,
          style: applyTheme(style, theme),
          center: [initial.lng, initial.lat],
          zoom,
          maxBounds: [
            [bbox[0], bbox[1]],
            [bbox[2], bbox[3]],
          ],
          dragRotate: false,
          attributionControl: { compact: true },
        });
        map.touchZoomRotate.disableRotation();
        const emit = () => {
          const c = map!.getCenter();
          onChangeRef.current({ lat: Number(c.lat.toFixed(6)), lng: Number(c.lng.toFixed(6)) });
        };
        map.on("moveend", emit);
        map.once("load", () => {
          emit();
          setReady(true);
          ref.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
        });
      });

    return () => {
      cancelled = true;
      map?.remove();
    };
    // Mount once; later changes to `initial` are ignored on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative h-64 overflow-hidden rounded-2xl border border-tinta/30">
      <div ref={ref} style={{ position: "absolute", inset: 0 }} aria-label="Mapa para escolher o ponto de encontro" role="application" data-ready={ready || undefined} />
      <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
        <svg width="34" height="44" viewBox="0 0 34 44" className="-translate-y-[20px] drop-shadow">
          <path d="M17 42 C17 42 4 28 4 17 A13 13 0 1 1 30 17 C30 28 17 42 17 42 Z" fill="var(--coral)" stroke="var(--tinta)" strokeWidth="1.5" />
          <circle cx="17" cy="17" r="4.5" fill="var(--papel-claro)" stroke="var(--tinta)" strokeWidth="1.2" />
        </svg>
      </div>
      <p className="pointer-events-none absolute inset-x-0 top-2 mx-auto w-fit rounded-full bg-papel-claro/95 px-3 py-1 text-xs font-bold">
        Arraste o mapa até o ponto de encontro
      </p>
    </div>
  );
}
