"use client";

import { Plus, User } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityDetail } from "@/components/sheet/ActivityDetail";
import { BottomSheet, type Snap } from "@/components/sheet/BottomSheet";
import { PlaceDetail } from "@/components/sheet/PlaceDetail";
import { ResultList } from "@/components/sheet/ResultList";
import { Logo, LogoMark } from "@/components/ui/Logo";
import type { City } from "@/lib/cities";
import { haversine } from "@/lib/geo";
import { loadOpeningHours, makeIsOpen } from "@/lib/openingHours";
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
  CompassButton,
  CompassRoseWatermark,
  CoordinateReadout,
  LayersMenu,
  NAV_HEIGHT,
  SearchPill,
  type ThemeChoice,
} from "./MapChrome";
import { MapView, type MapViewHandle, type MapViewState } from "./MapView";

const LIST_LIMIT = 60;
const DESKTOP_PANEL = 400;
const THEME_KEY = "carta-theme";

type Selection = { kind: "place" | "activity"; id: string } | null;

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

export function MapExperience({
  city,
  places,
  activities,
}: {
  city: City;
  places: PlaceSummary[];
  activities: ActivitySummary[];
}) {
  const mapRef = useRef<MapViewHandle>(null);
  const isDesktop = useMedia("(min-width: 1024px)");
  const [themeChoice, setThemeChoice, theme] = useThemeChoice();

  const [chip, setChip] = useState<ChipKey | null>(null);
  const [filters, setFilters] = useState<PlaceFilters>(EMPTY_FILTERS);
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<Selection>(null);
  const [snap, setSnap] = useState<Snap>("collapsed");
  const [sheetPx, setSheetPx] = useState(92);
  const [view, setView] = useState<MapViewState | null>(null);
  const [showPlaces, setShowPlaces] = useState(true);
  const [showActivities, setShowActivities] = useState(true);
  const [isOpen, setIsOpen] = useState<((p: PlaceSummary) => boolean | null) | undefined>(undefined);

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
    <div className="flex items-baseline justify-between gap-3 pt-1">
      <div className="min-w-0">
        <p className="font-serif text-sm italic text-tinta-suave">Carta de {city.name}</p>
        <p className="truncate font-mono text-[13px]">{countLine}</p>
      </div>
      {selection && (
        <button type="button" data-no-drag onClick={() => setSelection(null)} className="min-h-11 shrink-0 text-sm font-bold text-mare">
          ← Lista
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
      className={`fixed inset-0 overflow-hidden bg-papel ${view && view.zoom < 14.5 ? "labels-hidden" : ""}`}
      style={{ ["--map-inset-bottom" as string]: `${isDesktop ? 18 : bottomInset + 12}px` }}
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
      />
      <div className="paper-grain z-[4]" aria-hidden />
      <div className="chart-vignette" aria-hidden />
      <CompassRoseWatermark />
      <div className="chart-frame" aria-hidden>
        <span className="chart-frame__top" />
        <span className="chart-frame__bottom" />
        <span className="chart-frame__left" />
        <span className="chart-frame__right" />
      </div>

      {isDesktop ? (
        <>
          <aside
            className="surface absolute top-6 bottom-6 left-6 z-20 flex flex-col overflow-hidden rounded-3xl border border-tinta/20 bg-papel-claro shadow-[0_4px_0_color-mix(in_srgb,var(--tinta)_12%,transparent),0_18px_40px_color-mix(in_srgb,var(--tinta)_12%,transparent)]"
            style={{ width: DESKTOP_PANEL }}
            aria-label="Painel do mapa"
          >
            <div className="space-y-3 border-b-2 border-dotted border-tinta/20 p-4">
              <div className="flex items-center justify-between">
                <Link href="/" aria-label="SoloRota, início">
                  <Logo />
                </Link>
                <div className="flex items-center gap-1">
                  <Link href="/perfil" aria-label="Perfil" className="grid size-11 place-items-center rounded-full hover:bg-tinta/5">
                    <User size={20} strokeWidth={1.75} />
                  </Link>
                  <Link
                    href="/atividade/nova"
                    className="flex h-10 items-center gap-1 rounded-full border-[1.5px] border-tinta bg-coral px-3 text-sm font-bold text-on-fill"
                  >
                    <Plus size={16} strokeWidth={2} aria-hidden /> Criar roda
                  </Link>
                </div>
              </div>
              <SearchPill value={query} onChange={onQuery} cityName={city.name} />
              {chips}
              {listHeader}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-6">{body}</div>
          </aside>
          <Cartouche city={city} />
        </>
      ) : (
        <>
          <header className="pointer-events-none absolute inset-x-0 top-0 z-10 space-y-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="pointer-events-auto flex items-center gap-2">
              <Link href="/" aria-label="SoloRota, início" className="grid size-12 shrink-0 place-items-center rounded-full border-[1.5px] border-tinta bg-papel-claro shadow-[0_2px_0_color-mix(in_srgb,var(--tinta)_15%,transparent)]">
                <LogoMark size={30} />
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

      <div className="absolute right-4 z-10 flex flex-col gap-3" style={{ top: isDesktop ? 24 : 132 }}>
        <LayersMenu
          showPlaces={showPlaces}
          showActivities={showActivities}
          theme={themeChoice}
          onTogglePlaces={() => setShowPlaces((v) => !v)}
          onToggleActivities={() => setShowActivities((v) => !v)}
          onTheme={setThemeChoice}
        />
        <CompassButton onClick={() => mapRef.current?.recenter()} />
      </div>

      {view && (
        <div
          className="absolute z-10 transition-[bottom] duration-300"
          style={isDesktop ? { left: DESKTOP_PANEL + 48, bottom: 48 } : { left: 16, bottom: bottomInset + 42 }}
        >
          <CoordinateReadout lat={view.center.lat} lng={view.center.lng} zoom={view.zoom} />
        </div>
      )}
    </main>
  );
}

/** Title box of the chart, like the cartouche on an old nautical chart (desktop). */
function Cartouche({ city }: { city: City }) {
  return (
    <div className="surface pointer-events-none absolute right-24 bottom-16 z-10 border-[3px] border-double border-tinta bg-papel-claro/95 px-6 py-4 text-center shadow-[0_3px_0_color-mix(in_srgb,var(--tinta)_15%,transparent)]">
      <p className="text-[10px] font-bold tracking-[0.3em] text-tinta-suave uppercase">Carta do nômade</p>
      <p className="font-serif text-3xl leading-tight font-bold italic">{city.name}</p>
      <p className="font-mono text-[11px] text-tinta-suave">
        {Math.abs(city.center_lat).toFixed(2)}° S · {Math.abs(city.center_lng).toFixed(2)}° O · {city.state}
      </p>
      <p className="mt-1 border-t border-tinta/30 pt-1 font-serif text-[11px] italic">levantamento colaborativo · {new Date().getFullYear()}</p>
    </div>
  );
}
