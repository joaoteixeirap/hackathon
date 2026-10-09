"use client";

import { List, Map as MapIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CheckinSheet } from "@/components/checkin/CheckinSheet";
import { field } from "@/components/ui/styles";
import type { BBox } from "@/lib/geo";
import { loadOpeningHours, makeIsOpen } from "@/lib/openingHours";
import type { RadarPlace } from "@/lib/radarData";
import { passesRadarFilters, RADAR_FILTER_LABEL, radarInput, type RadarFilter } from "@/lib/radarFilters";
import { radarScore, rankForRadar } from "@/lib/radarScore";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/track";
import { RadarCard } from "./RadarCard";
import { RadarMap } from "./RadarMap";

const FILTERS: RadarFilter[] = ["now", "call", "outlets", "quiet", "recent", "near"];

type City = { slug: string; name: string; bbox: BBox; center_lat: number; center_lng: number; zoom: number };

export function RadarView({ city, places: initial }: { city: City; places: RadarPlace[] }) {
  const [places, setPlaces] = useState(initial);
  const [filters, setFilters] = useState<RadarFilter[]>([]);
  const [mode, setMode] = useState<"list" | "map">("list");
  const [isOpen, setIsOpen] = useState<((p: { opening_hours: string | null }) => boolean | null) | undefined>(undefined);
  // "Perto de mim": the position lives only in this state, never leaves the device (I5c).
  const [near, setNear] = useState<{ lat: number; lng: number } | null>(null);
  const [nearState, setNearState] = useState<"idle" | "asking" | "denied">("idle");
  const [hood, setHood] = useState<string>("");
  const [checkin, setCheckin] = useState<RadarPlace | null>(null);

  useEffect(() => track("view_radar", { city: city.slug }), [city.slug]);

  // The user's own favorites, read once for all cards (RLS returns only theirs).
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  useEffect(() => {
    let alive = true;
    createClient()
      .from("place_favorites")
      .select("place_id")
      .then(({ data }) => alive && setFavorites(new Set((data ?? []).map((r) => r.place_id as string))));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (filters.includes("now") && !isOpen) {
      loadOpeningHours().then((Ctor) => {
        const fn = makeIsOpen(Ctor);
        setIsOpen(() => (p: { opening_hours: string | null }) => fn(p as never));
      });
    }
  }, [filters, isOpen]);

  function toggle(f: RadarFilter) {
    const on = !filters.includes(f);
    setFilters((prev) => (on ? [...prev, f] : prev.filter((x) => x !== f)));
    if (on) track("radar_filter", { filter: f });
    if (f === "near" && on && !near) {
      if (!("geolocation" in navigator)) return setNearState("denied");
      setNearState("asking");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setNear({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setNearState("idle");
        },
        () => setNearState("denied"),
        { timeout: 10_000, maximumAge: 120_000 },
      );
    }
  }

  const neighborhoods = useMemo(
    () => [...new Set(places.map((p) => p.neighborhood).filter((n): n is string => !!n))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [places],
  );

  const ranked = useMemo(() => {
    const now = Date.now();
    const scored = places
      .filter((p) => passesRadarFilters(p, filters, { now, isOpen, near, neighborhood: hood || null }))
      .map((p) => ({ ...p, score: radarScore(radarInput(p), now) }));
    return rankForRadar(scored);
  }, [places, filters, isOpen, near, hood]);

  const needsHood = filters.includes("near") && !near && nearState === "denied";

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Filtros do Radar" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((f) => {
          const on = filters.includes(f);
          return (
            <button
              key={f}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(f)}
              className={`flex h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold transition ${on ? "bg-primary text-on-fill" : "border border-line bg-surface hover:bg-surface-2"}`}
            >
              {RADAR_FILTER_LABEL[f]}
            </button>
          );
        })}
      </div>

      {filters.includes("near") && (
        <p className="text-sm text-muted" role="status">
          {nearState === "asking" && "Pegando sua localização (fica só neste aparelho)…"}
          {near && "Lugares a até 2 km de você. Sua posição não é gravada."}
          {needsHood && "Sem localização: escolha um bairro."}
        </p>
      )}
      {needsHood && (
        <label className="block">
          <span className="sr-only">Bairro</span>
          <select value={hood} onChange={(e) => setHood(e.target.value)} className={field}>
            <option value="">Todos os bairros</option>
            {neighborhoods.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted tabular-nums" aria-live="polite">
          {ranked.length} {ranked.length === 1 ? "lugar" : "lugares"} em {city.name}, pela adequação
        </p>
        <div className="flex rounded-full bg-surface-2 p-1" role="radiogroup" aria-label="Ver como">
          {(["list", "map"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold ${mode === m ? "bg-surface shadow-soft-sm" : "text-muted"}`}
            >
              {m === "list" ? <List size={15} aria-hidden /> : <MapIcon size={15} aria-hidden />}
              {m === "list" ? "Lista" : "Mapa"}
            </button>
          ))}
        </div>
      </div>

      {ranked.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line p-6 text-center text-muted">
          Nenhum lugar com esses filtros ainda. Tire um filtro ou ajude a mapear medindo onde você está.
        </p>
      ) : mode === "map" ? (
        <RadarMap pins={ranked.slice(0, 50)} bbox={city.bbox} center={{ lat: city.center_lat, lng: city.center_lng }} zoom={city.zoom} />
      ) : (
        <ol className="space-y-3">
          {ranked.map((p, i) => (
            <li key={p.id}>
              <RadarCard place={p} rank={i + 1} score={p.score} onCheckin={() => setCheckin(p)} favorite={favorites.has(p.id)} />
            </li>
          ))}
        </ol>
      )}

      <p className="text-xs text-muted">
        A ordem vem só dos critérios medidos e relatados (conexão, tomadas, ruído, chamadas, permanência e frescor dos dados). Parceiros não pagam para subir aqui.
      </p>

      {checkin && (
        <CheckinSheet
          place={checkin}
          onClose={() => setCheckin(null)}
          onSaved={(t) => setPlaces((prev) => prev.map((p) => (p.id === checkin.id ? { ...p, ...t } : p)))}
        />
      )}
    </div>
  );
}
