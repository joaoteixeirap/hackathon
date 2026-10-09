"use client";

import { Layers, Map as MapIcon, Plus, Search, User, Users, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CATEGORY_BG, CategoryIcon } from "@/components/ui/CategoryIcon";
import { CATEGORIES, CHIP_ORDER, type ChipKey, type PlaceFilters } from "@/lib/places";

/* ------------------------------------------------------------------------- */

export function SearchPill({
  value,
  onChange,
  cityName,
  onFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  cityName: string;
  onFocus?: () => void;
}) {
  return (
    <label className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-full border border-tinta/20 bg-papel-claro px-4 shadow-[0_2px_0_color-mix(in_srgb,var(--tinta)_10%,transparent)] focus-within:ring-2 focus-within:ring-sol">
      <Search size={18} strokeWidth={1.75} className="shrink-0 text-tinta-suave" aria-hidden />
      <span className="sr-only">Buscar lugares e atividades</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        placeholder={`Buscar em ${cityName}…`}
        className="min-w-0 flex-1 bg-transparent text-[15px] text-tinta placeholder:text-tinta-suave focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" onClick={() => onChange("")} aria-label="Limpar busca" className="-mr-2 grid size-9 place-items-center rounded-full hover:bg-tinta/5">
          <X size={16} />
        </button>
      )}
    </label>
  );
}

/* ------------------------------------------------------------------------- */

const TOGGLES: { key: keyof Pick<PlaceFilters, "wifiStrong" | "openNow" | "hasOffer" | "seal">; label: string }[] = [
  { key: "wifiStrong", label: "Wi-Fi forte" },
  { key: "openNow", label: "Aberto agora" },
  { key: "hasOffer", label: "Tem oferta" },
  { key: "seal", label: "Com Selo" },
];

export function CategoryChips({
  active,
  onToggle,
  filters,
  onFilter,
  wrap = false,
}: {
  wrap?: boolean;
  active: ChipKey | null;
  onToggle: (k: ChipKey) => void;
  filters: PlaceFilters;
  onFilter: (key: (typeof TOGGLES)[number]["key"]) => void;
}) {
  return (
    <div
      className={wrap ? "flex flex-wrap gap-2 py-1" : "no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 py-1"}
      role="toolbar"
      aria-label="Categorias e filtros"
    >
      {CHIP_ORDER.map((k) => {
        const on = active === k;
        const label = k === "activities" ? "Atividades" : CATEGORIES[k].label;
        return (
          <button
            key={k}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(k)}
            className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-tinta px-3 text-sm font-bold transition-colors ${
              on
                ? `${CATEGORY_BG[k]} ${k === "activities" ? "text-[#1f2a30]" : "text-on-fill"}`
                : "bg-papel-claro text-tinta hover:bg-papel"
            } shadow-[0_2px_0_color-mix(in_srgb,var(--tinta)_12%,transparent)]`}
          >
            <CategoryIcon category={k} size={16} />
            {label}
          </button>
        );
      })}
      <span className={wrap ? "basis-full" : "mx-1 w-px shrink-0 self-stretch bg-tinta/25"} aria-hidden />
      {TOGGLES.map((t) => {
        const on = filters[t.key];
        return (
          <button
            key={t.key}
            type="button"
            aria-pressed={on}
            onClick={() => onFilter(t.key)}
            className={`flex h-9 shrink-0 items-center rounded-full border border-dashed px-3 font-mono text-[13px] transition-colors ${
              on ? "border-solid border-tinta bg-tinta text-papel-claro" : "border-tinta/60 bg-papel-claro/90 text-tinta"
            }`}
          >
            {on && <span aria-hidden className="mr-1">✓</span>}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------------- */

/** Compass rose button: recenters on the city (no GPS prompt in the MVP). */
export function CompassButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Recentralizar o mapa na cidade"
      className="grid size-12 place-items-center rounded-full border-[1.5px] border-tinta bg-papel-claro shadow-[0_2px_0_color-mix(in_srgb,var(--tinta)_15%,transparent)] hover:bg-papel"
    >
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden>
        <circle cx="16" cy="16" r="13" fill="none" stroke="var(--tinta)" strokeWidth="0.8" strokeDasharray="1 2" />
        <path d="M16 2 L18.2 16 L16 30 L13.8 16 Z" fill="var(--tinta)" />
        <path d="M16 2 L18.2 16 L13.8 16 Z" fill="var(--coral)" />
        <path d="M2 16 L16 14.4 L30 16 L16 17.6 Z" fill="var(--tinta-suave)" opacity="0.7" />
        <text x="16" y="9.5" textAnchor="middle" fontSize="5" fontWeight="700" fill="var(--papel-claro)" fontFamily="var(--font-sans)">
          N
        </text>
      </svg>
    </button>
  );
}

/* ------------------------------------------------------------------------- */

export type ThemeChoice = "auto" | "day" | "night";

export function LayersMenu({
  showPlaces,
  showActivities,
  theme,
  onTogglePlaces,
  onToggleActivities,
  onTheme,
}: {
  showPlaces: boolean;
  showActivities: boolean;
  theme: ThemeChoice;
  onTogglePlaces: () => void;
  onToggleActivities: () => void;
  onTheme: (t: ThemeChoice) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const Switch = ({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) => (
    <button type="button" role="switch" aria-checked={on} onClick={onClick} className="flex min-h-11 w-full items-center justify-between gap-4 text-sm">
      {label}
      <span className={`relative h-6 w-10 rounded-full border border-tinta transition-colors ${on ? "bg-mare" : "bg-papel"}`}>
        <span className={`absolute top-0.5 size-4 rounded-full border border-tinta bg-papel-claro transition-all ${on ? "left-5" : "left-0.5"}`} />
      </span>
    </button>
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Camadas do mapa"
        className="grid size-12 place-items-center rounded-full border-[1.5px] border-tinta bg-papel-claro shadow-[0_2px_0_color-mix(in_srgb,var(--tinta)_15%,transparent)] hover:bg-papel"
      >
        <Layers size={20} strokeWidth={1.75} />
      </button>
      {open && (
        <div className="surface absolute top-0 right-14 w-64 rounded-2xl border border-tinta/20 bg-papel-claro p-4 shadow-lg">
          <p className="mb-1 font-serif text-lg font-bold">Camadas</p>
          <Switch on={showPlaces} onClick={onTogglePlaces} label="Lugares" />
          <Switch on={showActivities} onClick={onToggleActivities} label="Atividades" />
          <p className="mt-3 mb-2 text-xs font-bold tracking-wider text-tinta-suave uppercase">Carta</p>
          <div className="grid grid-cols-3 overflow-hidden rounded-full border border-tinta text-sm" role="radiogroup" aria-label="Tema do mapa">
            {(["auto", "day", "night"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={theme === t}
                onClick={() => onTheme(t)}
                className={`min-h-10 ${theme === t ? "bg-tinta text-papel-claro" : ""}`}
              >
                {t === "auto" ? "Auto" : t === "day" ? "Dia" : "Noite"}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */

export const NAV_HEIGHT = 64;

export function BottomNav({ onMap, onGroups, groupsActive }: { onMap: () => void; onGroups: () => void; groupsActive: boolean }) {
  const item = "flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-bold";
  return (
    <nav
      aria-label="Navegação principal"
      className="surface fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-tinta/20 bg-papel-claro px-2"
      style={{ height: `calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <button type="button" onClick={onMap} className={`${item} ${groupsActive ? "text-tinta-suave" : "text-tinta"}`} aria-current={groupsActive ? undefined : "page"}>
        <MapIcon size={22} strokeWidth={1.75} aria-hidden />
        Mapa
      </button>
      <button type="button" onClick={onGroups} className={`${item} ${groupsActive ? "text-tinta" : "text-tinta-suave"}`}>
        <Users size={22} strokeWidth={1.75} aria-hidden />
        Grupos
      </button>
      <div className="flex flex-1 items-start justify-center">
        <Link
          href="/atividade/nova"
          aria-label="Criar atividade"
          className="-mt-5 grid size-14 place-items-center rounded-full border-[1.5px] border-tinta bg-coral text-on-fill shadow-[0_3px_0_color-mix(in_srgb,var(--tinta)_25%,transparent)]"
        >
          <Plus size={26} strokeWidth={2} aria-hidden />
        </Link>
      </div>
      <Link href="/perfil" className={`${item} text-tinta-suave`}>
        <User size={22} strokeWidth={1.75} aria-hidden />
        Perfil
      </Link>
    </nav>
  );
}

/* ------------------------------------------------------------------------- */

function dms(value: number, pos: string, neg: string): string {
  const abs = Math.abs(value);
  const d = Math.floor(abs);
  const mFloat = (abs - d) * 60;
  const m = Math.floor(mFloat);
  const s = Math.round((mFloat - m) * 60);
  return `${d}°${String(m).padStart(2, "0")}′${String(s).padStart(2, "0")}″${value >= 0 ? pos : neg}`;
}

/** Instrument readout of the chart center, in the corner like a chart's margin notes. */
export function CoordinateReadout({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  return (
    <p className="pointer-events-none font-mono text-[10px] leading-tight text-tinta [text-shadow:0_0_3px_var(--papel),0_0_2px_var(--papel)]" aria-hidden>
      {dms(lat, "N", "S")} {dms(lng, "L", "O")}
      <span className="text-tinta-suave"> · z{zoom.toFixed(1)}</span>
    </p>
  );
}

/** Faint decorative compass rose over the sea (bottom right of the chart). */
export function CompassRoseWatermark() {
  return (
    <svg
      className="pointer-events-none absolute right-[6%] bottom-[22%] z-[3] w-40 opacity-[0.16] lg:w-56"
      viewBox="0 0 200 200"
      aria-hidden
    >
      <g fill="none" stroke="var(--tinta)">
        <circle cx="100" cy="100" r="92" strokeWidth="1.2" />
        <circle cx="100" cy="100" r="84" strokeWidth="0.6" strokeDasharray="2 3" />
        <circle cx="100" cy="100" r="30" strokeWidth="0.8" />
        {Array.from({ length: 32 }, (_, i) => (
          <line
            key={i}
            x1="100"
            y1={i % 4 === 0 ? 8 : 12}
            x2="100"
            y2="16"
            strokeWidth={i % 4 === 0 ? 1.4 : 0.6}
            transform={`rotate(${i * 11.25} 100 100)`}
          />
        ))}
      </g>
      <g stroke="var(--tinta)" strokeWidth="0.8" strokeLinejoin="round">
        {[0, 90, 180, 270].map((r) => (
          <g key={r} transform={`rotate(${r} 100 100)`}>
            <path d="M100 20 L110 100 L100 100 Z" fill="var(--tinta)" />
            <path d="M100 20 L90 100 L100 100 Z" fill="var(--papel-claro)" />
          </g>
        ))}
        {[45, 135, 225, 315].map((r) => (
          <g key={r} transform={`rotate(${r} 100 100)`}>
            <path d="M100 45 L106 100 L100 100 Z" fill="var(--tinta-suave)" />
            <path d="M100 45 L94 100 L100 100 Z" fill="var(--papel-claro)" />
          </g>
        ))}
      </g>
      <text x="100" y="6" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--tinta)" fontFamily="var(--font-serif)" dominantBaseline="hanging">
        N
      </text>
    </svg>
  );
}
