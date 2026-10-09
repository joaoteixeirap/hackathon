"use client";

import { ArrowLeft, ChevronDown, Gauge, Luggage, Plus, User, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RouteTray } from "@/components/route/RouteTray";
import { useDayRoute } from "@/components/route/useDayRoute";
import { ActivityDetail } from "@/components/sheet/ActivityDetail";
import { BottomSheet, type Snap } from "@/components/sheet/BottomSheet";
import { PlaceDetail } from "@/components/sheet/PlaceDetail";
import { ResultList } from "@/components/sheet/ResultList";
import { AppNav, NAV_HEIGHT } from "@/components/ui/AppNav";
import { rememberMapUrl } from "@/components/ui/MapLink";
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
  activeFilterCount,
  filterPlaces,
  type ActivitySummary,
  type ChipKey,
  type PlaceCategory,
  type PlaceFilters,
  type PlaceSummary,
  stripDemo,
} from "@/lib/places";
import type { MapTheme } from "./applyTheme";
import {
  CategoryChips,
  LayersMenu,
  RecenterButton,
  SearchPill,
  type ThemeChoice,
  type ToggleKey,
} from "./MapChrome";
import { MapView, type MapViewHandle, type MapViewState } from "./MapView";
import type { FavoriteSpot } from "./favoriteMarker";
import type { PresenceSpot } from "./presenceMarker";
import { offersEmergencyOr24h } from "@/lib/essentialServices";
import { useActivityCompats } from "@/components/activity/useActivityCompats";
import { StateControls } from "./StateControls";
import { SP_BOUNDS, eventWindow, eventsInWindow, type EventPeriod } from "@/lib/stateMap";
import { locateCity } from "@/lib/locateCity";
import { todayInBrasilia } from "@/lib/offers";
import { takeLocation } from "@/lib/locationMemory";

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
  series_id: string | null;
};

/** "Quem está aqui" (F8): aggregated counts per neighborhood, fetched when the layer is on. */
function usePresence(cityId: string | null, enabled: boolean): PresenceSpot[] {
  const [spots, setSpots] = useState<PresenceSpot[]>([]);
  useEffect(() => {
    if (!enabled || !cityId || !isSupabaseConfigured()) {
      setSpots([]);
      return;
    }
    let alive = true;
    createClient()
      .rpc("presence_map", { p_city_id: cityId })
      .then(({ data }) => alive && setSpots((data ?? []) as PresenceSpot[]));
    return () => {
      alive = false;
    };
  }, [cityId, enabled]);
  return spots;
}

/** "Meus favoritos" (SPEC_V2 E3): the user's own saved places, fetched when the layer is on. */
function useFavorites(enabled: boolean): FavoriteSpot[] {
  const [spots, setSpots] = useState<FavoriteSpot[]>([]);
  useEffect(() => {
    if (!enabled || !isSupabaseConfigured()) {
      setSpots([]);
      return;
    }
    let alive = true;
    createClient()
      .from("place_favorites")
      .select("place_id, places(name, lat, lng)")
      .then(({ data }) => {
        if (!alive) return;
        type Row = { place_id: string; places: { name: string; lat: number; lng: number } | null };
        setSpots(((data ?? []) as unknown as Row[]).filter((r) => r.places).map((r) => ({ id: r.place_id, ...r.places! })));
      });
    return () => {
      alive = false;
    };
  }, [enabled]);
  return spots;
}

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
        async (payload) => {
          const row = payload.new as ActivityRow;
          const seriesRow = row?.series_id ? (await supabase.from("activity_series").select("id,weekday,start_time,is_official").eq("id",row.series_id).maybeSingle()).data : null;
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
              series: seriesRow ? { ...seriesRow, start_time:seriesRow.start_time.slice(0,5) } : null,
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
  places: initialPlaces,
  activities: initialActivities,
  initialSelection = null,
  initialChip = null,
  initialEssential = null,
  stateCities,
  initialTruncated=false,
}: {
  city: City;
  places: PlaceSummary[];
  activities: ActivitySummary[];
  initialSelection?: Selection;
  initialChip?: ChipKey | null;
  initialEssential?: { sub: string; always: boolean; pass: boolean } | null;
  stateCities?: City[];
  initialTruncated?:boolean;
}) {
  const statewide=Boolean(stateCities);
  const [area,setArea]=useState<{places:PlaceSummary[];activities:ActivitySummary[];truncated:boolean}>({places:initialPlaces,activities:initialActivities,truncated:false});
  const places=statewide?area.places:initialPlaces;
  const activities = useLiveActivities(statewide?null:city.id, statewide?area.activities:initialActivities);
  const mapRef = useRef<MapViewHandle>(null);
  const isDesktop = useMedia("(min-width: 1024px)");
  const [themeChoice, setThemeChoice, theme] = useThemeChoice();

  const [chip, setChip] = useState<ChipKey | null>(initialChip);
  const [filters, setFilters] = useState<PlaceFilters>(EMPTY_FILTERS);
  const [query, setQuery] = useState("");
  const [essential, setEssential] = useState(initialEssential);
  const [selection, setSelection] = useState<Selection>(initialSelection);
  const [snap, setSnap] = useState<Snap>(initialSelection ? "half" : "collapsed");
  const [sheetPx, setSheetPx] = useState(92);
  const [view, setView] = useState<MapViewState | null>(null);
  const [currentCity,setCurrentCity]=useState<City|null>(stateCities?.find(c=>c.slug===city.slug)??(statewide?null:city));
  const [period,setPeriod]=useState<EventPeriod>("upcoming"),[from,setFrom]=useState(todayInBrasilia),[to,setTo]=useState(todayInBrasilia);
  const [searching,setSearching]=useState(false),[areaStatus,setAreaStatus]=useState("");
  const [fetchedBounds,setFetchedBounds]=useState("");
  const [stateCardOpen,setStateCardOpen]=useState(true);
  const controller=useRef<AbortController|null>(null),viewRef=useRef<MapViewState|null>(null);viewRef.current=view;
  const citySearchPending=useRef(false);
  const citySlug=currentCity?.slug??(city.slug==="sp"?"santos":city.slug);
  const [showPlaces, setShowPlaces] = useState(true);
  const [showActivities, setShowActivities] = useState(true);
  const [showPresence, setShowPresence] = useState(false);
  const presence = usePresence(city.id, showPresence);
  const [showFavorites, setShowFavorites] = useState(false);
  const favorites = useFavorites(showFavorites);
  const dayRoute = useDayRoute(citySlug);
  const [mapReady, setMapReady] = useState(false);
  const [isOpen, setIsOpen] = useState<((p: PlaceSummary) => boolean | null) | undefined>(undefined);

  useEffect(() => track("view_map", { city: city.slug }), [city.slug]);
  // Header "Mapa" links come back here (path + query only).
  useEffect(() => {
    const t = setTimeout(() => rememberMapUrl(window.location.pathname + window.location.search), 0);
    return () => clearTimeout(t);
  }, [city.slug]);
  useEffect(()=>()=>controller.current?.abort(),[]);
  const searchArea=useCallback(async()=>{
   const v=viewRef.current;if(!statewide||!v)return;
   if(!eventWindow(period,from,to)){setAreaStatus("Escolha um intervalo válido de até um ano.");return;}
   controller.current?.abort();const abort=new AbortController();controller.current=abort;
   setSearching(true);setAreaStatus("");
   // Public viewport grid, ~1 km: it does not expose an exact GPS-centred rectangle.
   const bbox=v.bounds.map((n,i)=>(i<2?Math.floor(n*100):Math.ceil(n*100))/100).join(",");
   try{
    const res=await fetch(`/api/mapa-area?${new URLSearchParams({bbox,period,from,to,category:chip??"",sub:essential?.sub??"",wifi:filters.wifiStrong?"1":"0",calls:filters.callMode?"1":"0",seal:filters.seal?"1":"0"})}`,{signal:abort.signal});
    const data=await res.json();if(abort.signal.aborted)return;
    if(!res.ok)throw new Error(data.message??"Não foi possível buscar esta área.");
    setArea(data);setFetchedBounds(bbox);setSelection(null);
    setAreaStatus(data.unavailable?"Dados indisponíveis agora. Você pode escolher outra cidade.":data.truncated?"Há mais resultados nesta área. Aproxime o mapa e busque novamente.":"Área atualizada.");
    track("state_map_search",{period});
   }catch(e){if(!abort.signal.aborted)setAreaStatus(e instanceof Error?e.message:"Não foi possível buscar esta área.");}
   finally{if(!abort.signal.aborted)setSearching(false);}
  },[statewide,period,from,to,chip,essential,filters.wifiStrong,filters.callMode,filters.seal]);
  // First viewport and period changes fetch automatically; panning uses the explicit button.
  const hasView=Boolean(view);
  useEffect(()=>{if(statewide&&hasView)void searchArea();},[statewide,hasView,searchArea]);
  const selectCity=(slug:string)=>{
   const c=stateCities?.find(x=>x.slug===slug);if(!c)return;
   setCurrentCity(c);setSelection(null);setSnap("half");citySearchPending.current=true;mapRef.current?.goTo(c.center_lat,c.center_lng,c.zoom);
  };
  const locate=(point:{lat:number;lng:number})=>{
   return locateCity(point,stateCities??[]).then(c=>{if(!c){setAreaStatus("Escolha uma cidade de SP para explorar.");return;}
   setCurrentCity(c as City);citySearchPending.current=true;mapRef.current?.goTo(point.lat,point.lng,14);setSnap("half");});
  };

  useEffect(() => {
    if (filters.openNow && !isOpen) {
      loadOpeningHours().then((Ctor) => setIsOpen(() => makeIsOpen(Ctor)));
    }
  }, [filters.openNow, isOpen]);

  const shownPlaces = useMemo(() => {
    if (!showPlaces || chip === "activities") return [];
    return filterPlaces(places, { ...filters, category: chip as PlaceCategory | null, query }, isOpen).filter(p => !essential || ((essential.always ? offersEmergencyOr24h(p) : p.subcategory === essential.sub) && (!essential.pass || p.stay_policy === "pass_required")));
  }, [places, filters, chip, query, isOpen, showPlaces, essential]);

  const shownActivities = useMemo(() => {
    if (!showActivities || (chip !== null && chip !== "activities")) return [];
    const window=eventWindow(period,from,to);if(!window)return [];
    const seen=new Set<string>();
    return eventsInWindow(filterActivities(activities, query),window).filter(a=>!a.series||(!seen.has(a.series.id)&&seen.add(a.series.id)));
  }, [activities, chip, query, showActivities,period,from,to]);

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
  const compats=useActivityCompats([...visible.activities.slice(0,LIST_LIMIT).map(a=>a.id),...(selection?.kind==="activity" ? [selection.id] : [])]);

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
  const toggleFilter = (key: ToggleKey) =>
    setFilters((f) => ({ ...f, [key]: !f[key] }));

  const onQuery = (q: string) => {
    setQuery(q);
    setSelection(null);
    if (q && snap === "collapsed") setSnap("half");
  };

  const countLine = `${visible.places.length.toLocaleString("pt-BR")} ${visible.places.length === 1 ? "lugar" : "lugares"} · ${visible.activities.length} ${visible.activities.length === 1 ? "roda" : "rodas"} nesta área`;
  const emptyText =
    query || chip || activeFilterCount(filters) > 0
      ? "Nada com esses filtros neste trecho. Afaste o mapa ou limpe os filtros."
      : "Nada mapeado neste trecho ainda. Ajude a mapear.";

  const body = selectedPlace ? (
    <PlaceDetail
      key={selectedPlace.id}
      place={selectedPlace}
      onClose={() => selectPlace(null)}
      route={{
        inRoute: dayRoute.has({ kind: "place", id: selectedPlace.id }),
        full: dayRoute.full,
        onToggle: () => dayRoute.toggle({ kind: "place", id: selectedPlace.id, name: selectedPlace.name, lat: selectedPlace.lat, lng: selectedPlace.lng }),
      }}
    />
  ) : selectedActivity ? (
    <ActivityDetail
      activity={selectedActivity}
      compat={compats[selectedActivity.id]}
      onClose={() => selectPlace(null)}
      route={{
        inRoute: dayRoute.has({ kind: "activity", id: selectedActivity.id }),
        full: dayRoute.full,
        onToggle: () =>
          dayRoute.toggle({ kind: "activity", id: selectedActivity.id, name: stripDemo(selectedActivity.title), lat: selectedActivity.lat, lng: selectedActivity.lng }),
      }}
    />
  ) : (
    <ResultList
      compats={compats}
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
        <p className="font-display text-[17px] leading-tight font-bold">{selection ? "Detalhes" : "Explorar"}</p>
        <p className="truncate text-[13px] text-muted tabular-nums">{countLine}</p>
        {essential && <button type="button" className="min-h-11 text-sm font-semibold text-primary" onClick={() => setEssential(null)}>Limpar filtro de serviços essenciais</button>}
        <div className={`${!isDesktop && snap === "collapsed" ? "hidden" : "flex"} flex-wrap gap-x-4`} data-no-drag><Link href={`/estadia?aba=pessoas`} className="inline-flex min-h-11 items-center text-xs font-semibold text-primary">Pessoas compatíveis</Link><Link href="/explorar" className="inline-flex min-h-11 items-center text-xs font-semibold text-primary">Cidades e ferramentas ↗</Link>{!isDesktop&&<Link href="/estadias" className="inline-flex min-h-11 items-center text-xs font-semibold text-primary">Minhas estadias</Link>}{!statewide&&<Link href={`/mapa/sp?city=${city.slug}`} className="inline-flex min-h-11 items-center text-xs font-semibold text-primary">Explorar todo SP</Link>}</div>
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
  const stateControls=stateCities?<StateControls cities={stateCities} current={currentCity} onCity={selectCity} onLocated={locate} period={period} onPeriod={setPeriod} from={from} to={to} onDates={(f,t)=>{setFrom(f);setTo(t);}} search={!isDesktop&&snap==="full"?{run:()=>void searchArea(),pending:searching,status:areaStatus}:undefined}/>:null;
  const controls=selection?null:stateControls;
  const desktopNavLink="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink transition hover:bg-surface-2";
  const chips = (
    <CategoryChips active={chip} onToggle={toggleChip} filters={filters} onFilter={toggleFilter} filtersMenu={isDesktop} />
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
        onViewChange={v=>{setView(v);viewRef.current=v;if(citySearchPending.current){citySearchPending.current=false;void searchArea();}}}
        onReady={() => {setMapReady(true);const point=statewide?takeLocation():null;if(point){citySearchPending.current=true;mapRef.current?.goTo(point.lat,point.lng,14);}}}
        route={dayRoute.stops}
        presence={presence}
        favorites={favorites}
        navigationBounds={statewide?SP_BOUNDS:undefined}
        cities={stateCities}
        onSelectCity={selectCity}
      />
      {!mapReady && <MapLoading cityName={city.name} />}

      {isDesktop ? (
        <>
          <header className="absolute top-4 right-4 left-4 z-30 flex h-16 items-center gap-4 rounded-[24px] border border-line bg-surface/95 pr-3 pl-5 shadow-soft-lg backdrop-blur-md">
            <Link href="/" aria-label="SoloRota, início" className="shrink-0">
              <Logo />
            </Link>
            <div className="flex min-w-0 max-w-xl flex-1">
              <SearchPill value={query} onChange={onQuery} elevated={false} />
            </div>
            <nav aria-label="Navegação principal" className="ml-auto flex shrink-0 items-center gap-1">
              <Link href={`/radar/${citySlug}`} aria-label="Radar" className={desktopNavLink}>
                <Gauge size={17} aria-hidden /> <span className="hidden xl:inline">Radar</span>
              </Link>
              <Link href="/estadias" aria-label="Estadias" className={desktopNavLink}>
                <Luggage size={17} aria-hidden /> <span className="hidden xl:inline">Estadias</span>
              </Link>
              <Link href={currentCity ? `/comunidades?city=${currentCity.slug}` : "/comunidades"} aria-label="Comunidades" className={desktopNavLink}>
                <Users size={17} aria-hidden /> <span className="hidden xl:inline">Comunidades</span>
              </Link>
              <Link href="/perfil" aria-label="Perfil" className={desktopNavLink}>
                <User size={17} aria-hidden /> <span className="hidden xl:inline">Perfil</span>
              </Link>
              <Link href={`/atividade/nova?cidade=${citySlug}`} className={`${buttonAccent} ml-2 min-h-11 shrink-0 gap-1.5 px-5 text-sm whitespace-nowrap`}>
                <Plus size={16} strokeWidth={2.5} aria-hidden /> Criar roda
              </Link>
            </nav>
          </header>

          <div className="absolute top-24 right-4 z-20" style={{ left: DESKTOP_PANEL + 32 }}>
            {chips}
          </div>

          <aside
            className="absolute top-24 bottom-4 left-4 z-20 flex flex-col overflow-hidden rounded-[28px] border border-line bg-surface shadow-soft-lg"
            style={{ width: DESKTOP_PANEL }}
            aria-label="Painel do mapa"
          >
            <div className="border-b border-line px-5 pt-4 pb-1">{listHeader}</div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-3 pb-6">
              {initialTruncated && <p className="mb-3 text-xs text-muted">Cobertura parcial neste mapa. Use Buscar nesta área para ver mais resultados.</p>}
              {body}
            </div>
          </aside>

          {stateControls && (
            <section
              aria-label="Cidades e datas"
              className={`absolute top-[152px] right-4 z-10 flex max-h-[calc(100%-330px)] flex-col overflow-hidden rounded-[24px] border border-line bg-surface shadow-soft-lg ${stateCardOpen ? "w-[340px]" : ""}`}
            >
              <button
                type="button"
                onClick={() => setStateCardOpen((o) => !o)}
                aria-expanded={stateCardOpen}
                className="flex min-h-12 shrink-0 items-center justify-between gap-3 px-4 text-sm font-semibold hover:bg-surface-2"
              >
                {stateCardOpen ? "Cidades e datas" : `${currentCity?.name ?? "Cidades"} · datas`}
                <ChevronDown size={18} aria-hidden className={`text-muted transition-transform ${stateCardOpen ? "rotate-180" : ""}`} />
              </button>
              {stateCardOpen && <div className="min-h-0 flex-1 overflow-y-auto border-t border-line px-4">{stateControls}</div>}
            </section>
          )}
        </>
      ) : (
        <>
          <header className="pointer-events-none absolute inset-x-0 top-0 z-10 space-y-2.5 bg-gradient-to-b from-canvas/70 to-transparent px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
            <div className="pointer-events-auto flex items-center gap-2">
              <Link href="/" aria-label="SoloRota, início" className="shrink-0 rounded-[14px] shadow-soft-md">
                <LogoMark size={48} />
              </Link>
              <SearchPill value={query} onChange={onQuery} />
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
            {initialTruncated&&<p className="my-2 text-xs text-muted">Cobertura parcial neste mapa. Explore SP e use Buscar nesta área para ver mais resultados.</p>}{controls}{body}
          </BottomSheet>
          <AppNav
            active="map"
            citySlug={citySlug}
            onMapClick={() => {
              setChip(null);
              setSelection(null);
              setSnap("collapsed");
            }}
          />
        </>
      )}

      <div className={`absolute right-4 z-20 flex flex-col gap-2.5 ${isDesktop ? "bottom-14" : "top-[140px]"}`}>
        <LayersMenu
          showPlaces={showPlaces}
          showActivities={showActivities}
          showPresence={showPresence}
          showFavorites={showFavorites}
          theme={themeChoice}
          onTogglePlaces={() => setShowPlaces((v) => !v)}
          onToggleActivities={() => setShowActivities((v) => !v)}
          onTogglePresence={() => setShowPresence((v) => !v)}
          onToggleFavorites={() => setShowFavorites((v) => !v)}
          onTheme={setThemeChoice}
          opensUp={isDesktop}
        />
        <RecenterButton onClick={() => mapRef.current?.recenter()} />
        {statewide&&!isDesktop&&<button type="button" onClick={()=>{setSnap("full");setSelection(null);}} className="min-h-11 rounded-full border border-line bg-surface px-3 text-xs font-semibold shadow-soft-md">Cidades e datas</button>}
      </div>
      {statewide&&(isDesktop||snap!=="full")&&<div className={`absolute z-10 ${isDesktop?`top-[152px] flex flex-col items-center text-center ${stateCardOpen?"right-[372px]":"right-[260px]"}`:"inset-x-3 top-[140px] mr-[68px] max-w-xs"}`} style={isDesktop?{left:DESKTOP_PANEL+32}:undefined}><button type="button" onClick={()=>void searchArea()} disabled={searching} className="min-h-11 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-primary shadow-soft-md">{searching?"Buscando…":"Buscar nesta área"}</button><p role="status" className="mt-1 rounded-xl bg-surface/95 px-3 py-1 text-xs text-muted shadow-soft-sm">{areaStatus || (!fetchedBounds?"Explore uma cidade e busque os lugares por perto.":"Mova o mapa e busque novamente para atualizar.")}</p></div>}

      {dayRoute.stops.length > 0 && (
        <div
          className={`absolute z-10 ${isDesktop ? "right-20 bottom-4 w-96" : "inset-x-3 flex justify-center"}`}
          // Phones: just above the bottom sheet, like a mini player; the list opens upwards.
          style={isDesktop ? undefined : { bottom: "var(--map-inset-bottom)" }}
        >
          <RouteTray
            stops={dayRoute.stops}
            onOpen={(s) => (s.kind === "place" ? selectPlace(s.id) : activities.some((a) => a.id === s.id) && selectActivity(s.id))}
            onRemove={dayRoute.remove}
            onMove={dayRoute.move}
            onClear={dayRoute.clear}
          />
        </div>
      )}
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
