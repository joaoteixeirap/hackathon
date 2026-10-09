import { Wifi } from "lucide-react";

/** "Selo Amigo do Nômade": strong Wi-Fi confirmed by users + power outlets (SPEC F2). */
export function NomadBadge({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary">
        <Wifi size={11} strokeWidth={2.5} aria-hidden /> Selo
      </span>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-primary-soft p-3.5">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-on-fill">
        <Wifi size={20} strokeWidth={2.25} aria-hidden />
      </span>
      <p className="text-sm leading-snug">
        <strong className="block font-display text-[15px] font-bold text-primary">Selo Amigo do Nômade</strong>
        <span className="text-ink/80">Wi-Fi forte confirmado por quem trabalhou aqui, e tomadas disponíveis.</span>
      </p>
    </div>
  );
}
