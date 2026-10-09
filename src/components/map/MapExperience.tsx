"use client";

import { ArrowLeft, Plus, User } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityDetail } from "@/components/sheet/ActivityDetail";
import { BottomSheet, type Snap } from "@/components/sheet/BottomSheet";
import { PlaceDetail } from "@/components/sheet/PlaceDetail";
import { ResultList } from "@/components/sheet/ResultList";
import { Logo, LogoMark } from "@/components/ui/Logo";
import { buttonAccent } from "@/components/ui/styles";
import type { City } from "@/lib/cities";
import { haversine } from "@/lib/geo";
import { loadOpeningHours, makeIsOpen } from "@/lib/openingHours";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/track";
import {
  EMPTY_FILTERS,
  filterActivities,
  filterPlaces,
  type ActivitySummary,
  type ChipKey,
  type PlaceCategory,
  type PlaceFilters,
  type PlaceSummary,
} from "@/lib/places";
import type { MapTheme } from "./applyTheme";
import {
  BottomNav,
  CategoryChips,
  LayersMenu,
  NAV_HEIGHT,
  RecenterButton,
  SearchPill,
  type ThemeChoice,
} from "./MapChrome";
import { MapView, type MapViewHandle, type MapViewState } from "./MapView";

const LIST_LIMIT = 60;
const DESKTOP_PANEL = 400;
const THEME_KEY = "carta-theme";

export type Selection = { kind: "place" | "activity"; id: string } | null;

function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

function useThemeChoice(): [ThemeChoice, (t: ThemeChoice) => void, MapTheme] {
  const [choice, setChoice] = useState<ThemeChoice>("auto");
  const systemDark = useMedia("(prefers-color-scheme: dark)");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "day" || saved === "night") setChoice(saved);
    } catch {
      // storage unavailable: keep "auto"
    }
  }, []);

  const update = useCallback((t: ThemeChoice) => {
    setChoice(t);
    try {
      if (t === "auto") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, t);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (choice === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", choice);
  }, [choice]);

  return [choice, update, choice === "auto" ? (systemDark ? "night" : "day") : choice];
}

function inBounds(p: { lat: number; lng: number }, b: MapViewState["bounds"]) {
  return p.lng >= b[0] && p.lng <= b[2] && p.lat >= b[1] && p.lat <= b[3];
}

type ActivityRow = {
  id: string;
  title: string;
  category: ActivitySummary["category"];
  starts_at: string;
  ends_at: string;
  meeting_lat: number;
  meeting_lng: number;
  meeting_label: string | null;
  capacity: number;
  status: string;
  is_demo: boolean;
  city_id: string;
};

/** New/changed activities from other users appear without reloading (F3: < 5 s). */
function useLiveActivities(cityId: string | null, initial: ActivitySummary[]): ActivitySummary[] {
  const [list, setList] = useState(initial);
  useEffect(() => setList(initial), [initial]);

  useEffect(() => {
    if (!cityId || !isSupabaseConfigured()) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`activities:${cityId}`)
      .on<ActivityRow>(
        "postgres_changes",
        { event: "*", schema: "public", table: "activities", filter: `city_id=eq.${cityId}` },
        (payload) => {
          const row = payload.new as ActivityRow;
          setList((prev) => {
            const rest = prev.filter((a) => a.id !== (row?.id ?? (payload.old as ActivityRow)?.id));
            const visible =
              row?.id &&
              (row.status === "open" || row.status === "full") &&
              new Date(row.ends_at).getTime() > Date.now();
            if (!visible) return rest;
            const next: ActivitySummary = {
              id: row.id,
              title: row.title,
              category: row.category,
              starts_at: row.starts_at,
              ends_at: row.ends_at,
              lat: row.meeting_lat,
              lng: row.meeting_lng,
              meeting_label: row.meeting_label,
              capacity: row.capacity,
              status: row.status as "open" | "full",
              is_demo: row.is_demo,
            };
            return [...rest, next].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [cityId]);

  return list;
}

export function MapExperience({
  city,
  places,
  activities: initialActivities,
  initialSelection = null,
}: {
  city: City;
  places: PlaceSummary[];
  activities: ActivitySummary[];
  initialSelection?: Selection;
}) {
  const activities = useLiveActivities(city.id, initialActivities);
  const mapRef = useRef<MapViewHandle>(null);
  const isDesktop = useMedia("(min-width: 1024px)");
  const [themeChoice, setThemeChoice, theme] = useThemeChoice();

  const [chip, setChip] = useState<ChipKey | null>(null);
  const [filters, setFilters] = useState<PlaceFilters>(EMPTY_FILTERS);
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<Selection>(initialSelection);
  const [snap, setSnap] = useState<Snap>(initialSelection ? "half" : "collapsed");
  const [sheetPx, setSheetPx] = useState(92);
  const [view, setView] = useState<MapViewState | null>(null);
  const [showPlaces, setShowPlaces] = useState(true);
  const [showActivities, setShowActivities] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [isOpen, setIsOpen] = useState<((p: PlaceSummary) => boolean | null) | undefined>(undefined);

  useEffect(() => track("view_map", { city: city.slug }), [city.slug]);

  useEffect(() => {
    if (filters.openNow && !isOpen) {
      loadOpeningHours().then((Ctor) => setIsOpen(() => makeIsOpen(Ctor)));
    }
  }, [filters.openNow, isOpen]);

  const shownPlaces = useMemo(() => {
    if (!showPlaces || chip === "activities") return [];
    return filterPlaces(places, { ...filters, category: chip as PlaceCategory | null, query }, isOpen);
  }, [places, filters, chip, query, isOpen, showPlaces]);

  const shownActivities = useMemo(() => {
    if (!showActivities || (chip !== null && chip !== "activities")) return [];
    return filterActivities(activities, query);
  }, [activities, chip, query, showActivities]);

  const center = useMemo(
    () => view?.center ?? { lat: city.center_lat, lng: city.center_lng },
    [view, city.center_lat, city.center_lng],
  );
  const visible = useMemo(() => {
    const b = view?.bounds;
    const ps = (b ? shownPlaces.filter((p) => inBounds(p, b)) : shownPlaces)
      .map((p) => ({ p, d: haversine(center, p) }))
      .sort((a, z) => Number(z.p.featured) - Number(a.p.featured) || a.d - z.d);
    const as = b ? shownActivities.filter((a) => inBounds(a, b)) : shownActivities;
    return { places: ps.map((x) => x.p), activities: as };
  }, [shownPlaces, shownActivities, view, center]);

  const selectedPlace = selection?.kind === "place" ? places.find((p) => p.id === selection.id) : undefined;
  const selectedActivity = selection?.kind === "activity" ? activities.find((a) => a.id === selection.id) : undefined;

  const selectPlace = useCallback(
    (id: string | null) => {
      if (!id) {
        setSelection(null);
        setSnap("collapsed");
        return;
      }
      setSelection({ kind: "place", id });
      setSnap("half");
      track("open_place", { place_id: id });
      const p = places.find((x) => x.id === id);
      if (p) mapRef.current?.flyTo(p.lat, p.lng);
    },
    [places],
  );

  const selectActivity = useCallback(
    (id: string) => {
      setSelection({ kind: "activity", id });
      setSnap("half");
      const a = activities.find((x) => x.id === id);
      if (a) mapRef.current?.flyTo(a.lat, a.lng);
    },
    [activities],
  );

  const toggleChip = (k: ChipKey) => {
    setChip((c) => (c === k ? null : k));
    setSelection(null);
  };
  const toggleFilter = (key: "wifiStrong" | "openNow" | "hasOffer" | "seal") =>
    setFilters((f) => ({ ...f, [key]: !f[key] }));

  const onQuery = (q: string) => {
    setQuery(q);
    setSelection(null);
    if (q && snap === "collapsed") setSnap("half");
  };

  const countLine = `${visible.places.length.toLocaleString("pt-BR")} ${visible.places.length === 1 ? "lugar" : "lugares"} · ${visible.activities.length} ${visible.activities.length === 1 ? "roda" : "rodas"} nesta área`;
  const emptyText =
    query || chip || filters.wifiStrong || filters.openNow || filters.hasOffer || filters.seal
      ? "Nada com esses filtros neste trecho. Afaste o mapa ou limpe os filtros."
      : "Nada mapeado neste trecho ainda. Ajude a mapear.";

  const body = selectedPlace ? (
    <PlaceDetail key={selectedPlace.id} place={selectedPlace} onClose={() => selectPlace(null)} />
  ) : selectedActivity ? (
    <ActivityDetail activity={selectedActivity} onClose={() => selectPlace(null)} />
  ) : (
    <ResultList
      places={visible.places.slice(0, LIST_LIMIT)}
      activities={visible.activities}
      center={center}
      onSelectPlace={selectPlace}
      onSelectActivity={selectActivity}
      emptyText={emptyText}
    />
  );

  const listHeader = (
    <div className="flex items-center justify-between gap-3 pt-1 pb-1">
      <div className="min-w-0">
        <p className="font-display text-[17px] leading-tight font-bold">{selection ? "Detalhes" : `Explorar ${city.name}`}</p>
        <p className="truncate text-[13px] text-muted tabular-nums">{countLine}</p>
      </div>
      {selection && (
        <button
          type="button"
          data-no-drag
          onClick={() => setSelection(null)}
          className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full bg-surface-2 px-3 text-sm font-semibold text-ink"
        >
          <ArrowLeft size={15} aria-hidden /> Lista
        </button>
      )}
    </div>
  );

  const bottomInset = isDesktop ? 0 : sheetPx + NAV_HEIGHT;
  const chips = (
    <CategoryChips active={chip} onToggle={toggleChip} filters={filters} onFilter={toggleFilter} wrap={isDesktop} />
  );

  return (
    <main
      className={`fixed inset-0 overflow-hidden bg-canvas ${view && view.zoom < 14.5 ? "labels-hidden" : ""}`}
      style={{ ["--map-inset-bottom" as string]: `${isDesktop ? 16 : bottomInset + 10}px` }}
    >
      <MapView
        ref={mapRef}
        city={city}
        theme={theme}
        places={shownPlaces}
        activities={shownActivities}
        selectedPlaceId={selection?.kind === "place" ? selection.id : null}
        sheetFraction={isDesktop ? 0 : 0.45}
        leftInset={isDesktop ? DESKTOP_PANEL + 32 : 0}
        onSelectPlace={selectPlace}
        onSelectActivity={selectActivity}
        onViewChange={setView}
        onReady={() => setMapReady(true)}
      />
      {!mapReady && <MapLoading cityName={city.name} />}

      {isDesktop ? (
        <aside
          className="absolute top-4 bottom-4 left-4 z-20 flex flex-col overflow-hidden rounded-[28px] border border-line bg-surface shadow-soft-lg"
          style={{ width: DESKTOP_PANEL }}
          aria-label="Painel do mapa"
        >
          <div className="space-y-4 border-b border-line p-5">
            <div className="flex items-center justify-between">
              <Link href="/" aria-label="SoloRota, início">
                <Logo />
              </Link>
              <div className="flex items-center gap-1.5">
                <Link href="/perfil" aria-label="Perfil" className="grid size-11 place-items-center rounded-full text-ink hover:bg-surface-2">
                  <User size={20} strokeWidth={2} />
                </Link>
                <Link href="/atividade/nova" className={`${buttonAccent} min-h-10 gap-1.5 px-4 text-sm`}>
                  <Plus size={16} strokeWidth={2.5} aria-hidden /> Criar roda
                </Link>
              </div>
            </div>
            <SearchPill value={query} onChange={onQuery} cityName={city.name} elevated={false} />
            {chips}
          </div>
          <div className="px-5 pt-4">{listHeader}</div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-1 pb-6">{body}</div>
        </aside>
      ) : (
        <>
          <header className="pointer-events-none absolute inset-x-0 top-0 z-10 space-y-2.5 bg-gradient-to-b from-canvas/70 to-transparent px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
            <div className="pointer-events-auto flex items-center gap-2">
              <Link href="/" aria-label="SoloRota, início" className="shrink-0 rounded-[14px] shadow-soft-md">
                <LogoMark size={48} />
              </Link>
              <SearchPill value={query} onChange={onQuery} cityName={city.name} />
            </div>
            <div className="pointer-events-auto">{chips}</div>
          </header>
          <BottomSheet
            snap={snap}
            onSnapChange={setSnap}
            bottomOffset={NAV_HEIGHT}
            onVisibleHeight={setSheetPx}
            header={listHeader}
            label={selection ? "Detalhes" : "Resultados"}
            scrollFrom={selection ? "half" : "full"}
          >
            {body}
          </BottomSheet>
          <BottomNav
            groupsActive={chip === "activities"}
            onMap={() => {
              setChip(null);
              setSelection(null);
              setSnap("collapsed");
            }}
            onGroups={() => {
              setChip("activities");
              setSelection(null);
              setSnap("half");
            }}
          />
        </>
      )}

      <div className="absolute right-4 z-10 flex flex-col gap-2.5" style={{ top: isDesktop ? 16 : 132 }}>
        <LayersMenu
          showPlaces={showPlaces}
          showActivities={showActivities}
          theme={themeChoice}
          onTogglePlaces={() => setShowPlaces((v) => !v)}
          onToggleActivities={() => setShowActivities((v) => !v)}
          onTheme={setThemeChoice}
        />
        <RecenterButton onClick={() => mapRef.current?.recenter()} />
      </div>
    </main>
  );
}

/** Branded placeholder while the basemap and pins load (no blank screen). */
function MapLoading({ cityName }: { cityName: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1] grid place-items-center bg-canvas" role="status">
      <div className="flex flex-col items-center gap-3">
        <LogoMark size={56} className="motion-safe:animate-pulse" />
        <p className="text-sm font-semibold text-muted">Carregando o mapa de {cityName}…</p>
      </div>
    </div>
  );
}
