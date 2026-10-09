"use client";

import { Check, Layers, LocateFixed, Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CATEGORY_TEXT, CategoryIcon } from "@/components/ui/CategoryIcon";
import { iconButton } from "@/components/ui/styles";
import { CATEGORIES, CHIP_ORDER, type ChipKey, type PlaceFilters } from "@/lib/places";

/* ------------------------------------------------------------------------- */

export function SearchPill({
  value,
  onChange,
  onFocus,
  elevated = true,
}: {
  value: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
  elevated?: boolean;
}) {
  return (
    <label
      className={`flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-full bg-surface px-4 transition-shadow focus-within:ring-4 focus-within:ring-primary/15 ${
        elevated ? "shadow-soft-md" : "border border-line"
      }`}
    >
      <Search size={18} strokeWidth={2} className="shrink-0 text-muted" aria-hidden />
      <span className="sr-only">Buscar lugares e atividades</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        placeholder="Buscar"
        className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-ink placeholder:font-normal placeholder:text-muted focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" onClick={() => onChange("")} aria-label="Limpar busca" className="-mr-2 grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2">
          <X size={16} />
        </button>
      )}
    </label>
  );
}

/* ------------------------------------------------------------------------- */

export type ToggleKey = keyof Pick<PlaceFilters, "wifiStrong" | "openNow" | "hasOffer" | "seal" | "callMode" | "recent">;

const TOGGLES: { key: ToggleKey; label: string }[] = [
  { key: "wifiStrong", label: "Wi-Fi forte" },
  { key: "openNow", label: "Aberto agora" },
  { key: "hasOffer", label: "Tem oferta" },
  { key: "seal", label: "Com Selo" },
  { key: "callMode", label: "Modo chamada" },
  { key: "recent", label: "Dados recentes" },
];

export function CategoryChips({
  active,
  onToggle,
  filters,
  onFilter,
  filtersMenu = false,
}: {
  /** Desktop: categories in a draggable strip, the filter toggles behind a "Filtros" button. */
  filtersMenu?: boolean;
  active: ChipKey | null;
  onToggle: (k: ChipKey) => void;
  filters: PlaceFilters;
  onFilter: (key: ToggleKey) => void;
}) {
  const base =
    "flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20";
  const idle = "bg-surface text-ink shadow-soft-sm hover:bg-surface-2";
  const drag = useDragScroll();
  const categories = CHIP_ORDER.map((k) => {
    const on = active === k;
    const label = k === "activities" ? "Atividades" : CATEGORIES[k].label;
    return (
      <button key={k} type="button" aria-pressed={on} onClick={() => onToggle(k)} className={`${base} ${on ? "bg-primary text-on-fill shadow-soft-sm" : idle}`}>
        <CategoryIcon category={k} size={16} className={on ? "" : CATEGORY_TEXT[k]} />
        {label}
      </button>
    );
  });

  if (filtersMenu) {
    return (
      <div className="flex items-center gap-2" role="toolbar" aria-label="Categorias e filtros">
        <div
          {...drag}
          className="no-scrollbar flex min-w-0 flex-1 cursor-grab gap-2 overflow-x-auto py-1 pr-10 select-none active:cursor-grabbing [mask-image:linear-gradient(to_right,black_calc(100%-40px),transparent)]"
        >
          {categories}
        </div>
        <FiltersMenu filters={filters} onFilter={onFilter} chipClass={base} />
      </div>
    );
  }

  return (
    <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pt-0.5 pb-2" role="toolbar" aria-label="Categorias e filtros">
      {categories}
      <span className="mx-0.5 w-px shrink-0 self-stretch bg-line" aria-hidden />
      {TOGGLES.map((t) => {
        const on = filters[t.key];
        return (
          <button key={t.key} type="button" aria-pressed={on} onClick={() => onFilter(t.key)} className={`${base} ${on ? "bg-primary-soft text-primary ring-1 ring-primary/40" : idle}`}>
            {on && <Check size={14} strokeWidth={2.5} aria-hidden />}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** Mouse users can't swipe: let them drag the strip sideways and turn the vertical wheel into horizontal scroll. */
function useDragScroll() {
  const state = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const moved = useRef(false);
  return {
    onWheel: (e: React.WheelEvent<HTMLDivElement>) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) e.currentTarget.scrollLeft += e.deltaY;
    },
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      state.current = { x: e.clientX, left: e.currentTarget.scrollLeft, moved: false };
      moved.current = false;
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      const s = state.current;
      if (!s) return;
      const dx = e.clientX - s.x;
      if (!s.moved && Math.abs(dx) > 5) {
        s.moved = moved.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      if (s.moved) e.currentTarget.scrollLeft = s.left - dx;
    },
    onPointerUp: () => {
      state.current = null;
    },
    onPointerCancel: () => {
      state.current = null;
    },
    // A drag that ends over a chip must not toggle it.
    onClickCapture: (e: React.MouseEvent) => {
      if (moved.current) {
        e.stopPropagation();
        e.preventDefault();
        moved.current = false;
      }
    },
  };
}

function FiltersMenu({ filters, onFilter, chipClass }: { filters: PlaceFilters; onFilter: (key: ToggleKey) => void; chipClass: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const count = TOGGLES.filter((t) => filters[t.key]).length;

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

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`${chipClass} ${count ? "bg-primary-soft text-primary ring-1 ring-primary/40" : "bg-surface text-ink shadow-soft-sm hover:bg-surface-2"}`}
      >
        <SlidersHorizontal size={16} aria-hidden />
        Filtros
        {count > 0 && <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] text-on-fill tabular-nums">{count}</span>}
      </button>
      {open && (
        <div className="absolute top-full right-0 z-30 mt-2 w-72 rounded-3xl border border-line bg-surface p-4 shadow-soft-lg">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-display text-lg font-bold">Filtros</p>
            {count > 0 && (
              <button type="button" onClick={() => TOGGLES.forEach((t) => filters[t.key] && onFilter(t.key))} className="min-h-9 text-sm font-semibold text-primary">
                Limpar
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {TOGGLES.map((t) => {
              const on = filters[t.key];
              return (
                <button
                  key={t.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onFilter(t.key)}
                  className={`flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition ${on ? "bg-primary-soft text-primary ring-1 ring-primary/40" : "border border-line bg-surface text-ink hover:bg-surface-2"}`}
                >
                  {on && <Check size={14} strokeWidth={2.5} aria-hidden />}
                  {t.label}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted">Valem para os lugares do mapa e da lista.</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */

/** Recenters on the city (no GPS prompt in the MVP). */
export function RecenterButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Recentralizar o mapa na cidade" className={iconButton}>
      <LocateFixed size={20} strokeWidth={2} />
    </button>
  );
}

/* ------------------------------------------------------------------------- */

export type ThemeChoice = "auto" | "day" | "night";

export function LayersMenu({
  showPlaces,
  showActivities,
  showPresence,
  showFavorites,
  theme,
  onTogglePlaces,
  onToggleActivities,
  onTogglePresence,
  onToggleFavorites,
  onTheme,
  opensUp = false,
}: {
  showPlaces: boolean;
  showActivities: boolean;
  showPresence: boolean;
  showFavorites: boolean;
  theme: ThemeChoice;
  onTogglePlaces: () => void;
  onToggleActivities: () => void;
  onTogglePresence: () => void;
  onToggleFavorites: () => void;
  onTheme: (t: ThemeChoice) => void;
  opensUp?: boolean;
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
    <button type="button" role="switch" aria-checked={on} onClick={onClick} className="flex min-h-11 w-full items-center justify-between gap-4 text-sm font-medium">
      {label}
      <span className={`relative h-6 w-10 rounded-full transition-colors ${on ? "bg-primary" : "bg-line"}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-surface shadow-soft-sm transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  );

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Camadas do mapa" className={iconButton}>
        <Layers size={20} strokeWidth={2} />
      </button>
      {open && (
        <div className={`absolute ${opensUp ? "bottom-0" : "top-0"} right-14 w-64 rounded-3xl border border-line bg-surface p-4 shadow-soft-lg`}>
          <p className="mb-1 font-display text-lg font-bold">Camadas</p>
          <Switch on={showPlaces} onClick={onTogglePlaces} label="Lugares" />
          <Switch on={showActivities} onClick={onToggleActivities} label="Atividades" />
          <Switch on={showFavorites} onClick={onToggleFavorites} label="Meus favoritos" />
          <Switch on={showPresence} onClick={onTogglePresence} label="Quem está aqui" />
          <p className="text-xs text-muted">Nômades por bairro, só onde há 3 ou mais. Nunca a posição de alguém.</p>
          <p className="mt-3 mb-2 text-xs font-semibold text-muted">Aparência</p>
          <div className="grid grid-cols-3 gap-1 rounded-full bg-surface-2 p-1 text-sm" role="radiogroup" aria-label="Tema do mapa">
            {(["auto", "day", "night"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={theme === t}
                onClick={() => onTheme(t)}
                className={`min-h-9 rounded-full font-semibold transition ${theme === t ? "bg-surface text-ink shadow-soft-sm" : "text-muted"}`}
              >
                {t === "auto" ? "Auto" : t === "day" ? "Claro" : "Escuro"}
              </button>
            ))}
          </div>
          <Link href="/sobre" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline">
            Sobre, privacidade e fontes
          </Link>
        </div>
      )}
    </div>
  );
}
