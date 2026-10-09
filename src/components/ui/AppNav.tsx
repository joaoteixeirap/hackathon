import { Gauge, Luggage, Map as MapIcon, Plus, User } from "lucide-react";
import Link from "next/link";

export const NAV_HEIGHT = 68;

export type NavTab = "map" | "radar" | "stay" | "profile";

/** Bottom navigation (SPEC_V2 §3): Mapa · Radar · ＋ · Estadia · Perfil. Phones only. */
export function AppNav({ active, citySlug, onMapClick }: { active: NavTab; citySlug: string; onMapClick?: () => void }) {
  const item = "flex min-h-11 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors";
  const cls = (tab: NavTab) => `${item} ${active === tab ? "text-primary" : "text-muted"}`;
  const stroke = (tab: NavTab) => (active === tab ? 2.25 : 1.75);
  const current = (tab: NavTab) => (active === tab ? ("page" as const) : undefined);

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-line bg-surface/95 px-2 backdrop-blur-md lg:hidden"
      style={{ height: `calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))`, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {onMapClick && active === "map" ? (
        <button type="button" onClick={onMapClick} className={cls("map")} aria-current="page">
          <MapIcon size={22} strokeWidth={stroke("map")} aria-hidden />
          Mapa
        </button>
      ) : (
        <Link href={`/mapa/${citySlug}`} className={cls("map")} aria-current={current("map")}>
          <MapIcon size={22} strokeWidth={stroke("map")} aria-hidden />
          Mapa
        </Link>
      )}
      <Link href={`/radar/${citySlug}`} className={cls("radar")} aria-current={current("radar")}>
        <Gauge size={22} strokeWidth={stroke("radar")} aria-hidden />
        Radar
      </Link>
      <div className="flex flex-1 items-center justify-center">
        <Link
          href="/atividade/nova"
          aria-label="Criar atividade"
          className="grid size-12 place-items-center rounded-2xl bg-accent text-[#0f1f2a] shadow-[0_6px_16px_rgb(255_91_58/0.4)] transition active:scale-95"
        >
          <Plus size={24} strokeWidth={2.5} aria-hidden />
        </Link>
      </div>
      <Link href="/estadia" className={cls("stay")} aria-current={current("stay")}>
        <Luggage size={22} strokeWidth={stroke("stay")} aria-hidden />
        Estadia
      </Link>
      <Link href="/perfil" className={cls("profile")} aria-current={current("profile")}>
        <User size={22} strokeWidth={stroke("profile")} aria-hidden />
        Perfil
      </Link>
    </nav>
  );
}
