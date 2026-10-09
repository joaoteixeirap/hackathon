"use client";

import { Check, Layers, LocateFixed, Map as MapIcon, Plus, Search, User, Users, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CATEGORY_TEXT, CategoryIcon } from "@/components/ui/CategoryIcon";
import { iconButton } from "@/components/ui/styles";
import { CATEGORIES, CHIP_ORDER, type ChipKey, type PlaceFilters } from "@/lib/places";

/* ------------------------------------------------------------------------- */

export function SearchPill({
  value,
  onChange,
  cityName,
  onFocus,
  elevated = true,
}: {
  value: string;
  onChange: (v: string) => void;
  cityName: string;
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
        placeholder={`Buscar em ${cityName}`}
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
  const base =
    "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20";
  const idle = wrap ? "border border-line bg-surface text-ink hover:bg-surface-2" : "bg-surface text-ink shadow-soft-sm hover:bg-surface-2";
  return (
    <div
      className={wrap ? "flex flex-wrap gap-2" : "no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pt-0.5 pb-2"}
      role="toolbar"
      aria-label="Categorias e filtros"
    >
      {CHIP_ORDER.map((k) => {
        const on = active === k;
        const label = k === "activities" ? "Atividades" : CATEGORIES[k].label;
        return (
          <button key={k} type="button" aria-pressed={on} onClick={() => onToggle(k)} className={`${base} ${on ? "bg-primary text-on-fill shadow-soft-sm" : idle}`}>
            <CategoryIcon category={k} size={16} className={on ? "" : CATEGORY_TEXT[k]} />
            {label}
          </button>
        );
      })}
      <span className={wrap ? "basis-full" : "mx-0.5 w-px shrink-0 self-stretch bg-line"} aria-hidden />
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
  theme,
  onTogglePlaces,
  onToggleActivities,
  onTogglePresence,
  onTheme,
}: {
  showPlaces: boolean;
  showActivities: boolean;
  showPresence: boolean;
  theme: ThemeChoice;
  onTogglePlaces: () => void;
  onToggleActivities: () => void;
  onTogglePresence: () => void;
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
        <div className="absolute top-0 right-14 w-64 rounded-3xl border border-line bg-surface p-4 shadow-soft-lg">
          <p className="mb-1 font-display text-lg font-bold">Camadas</p>
          <Switch on={showPlaces} onClick={onTogglePlaces} label="Lugares" />
          <Switch on={showActivities} onClick={onToggleActivities} label="Atividades" />
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
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */

export const NAV_HEIGHT = 68;

export function BottomNav({ onMap, onGroups, groupsActive }: { onMap: () => void; onGroups: () => void; groupsActive: boolean }) {
  const item = "flex min-h-11 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors";
  const on = "text-primary";
  const off = "text-muted";
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-line bg-surface/95 px-2 backdrop-blur-md"
      style={{ height: `calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <button type="button" onClick={onMap} className={`${item} ${groupsActive ? off : on}`} aria-current={groupsActive ? undefined : "page"}>
        <MapIcon size={22} strokeWidth={groupsActive ? 1.75 : 2.25} aria-hidden />
        Explorar
      </button>
      <button type="button" onClick={onGroups} className={`${item} ${groupsActive ? on : off}`}>
        <Users size={22} strokeWidth={groupsActive ? 2.25 : 1.75} aria-hidden />
        Grupos
      </button>
      <div className="flex flex-1 items-center justify-center">
        <Link
          href="/atividade/nova"
          aria-label="Criar atividade"
          className="grid size-12 place-items-center rounded-2xl bg-accent text-white shadow-[0_6px_16px_rgb(255_91_58/0.4)] transition active:scale-95"
        >
          <Plus size={24} strokeWidth={2.5} aria-hidden />
        </Link>
      </div>
      <Link href="/perfil" className={`${item} ${off}`}>
        <User size={22} strokeWidth={1.75} aria-hidden />
        Perfil
      </Link>
    </nav>
  );
}
