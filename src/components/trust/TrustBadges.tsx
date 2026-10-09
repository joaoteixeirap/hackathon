import { AlertTriangle, CheckCircle2, Clock, HelpCircle, Video, Wifi } from "lucide-react";
import { FRESHNESS_LABEL, sealStatus, shortDate, isCallReady, type Freshness } from "@/lib/trust";

const FRESHNESS_STYLE: Record<Freshness, { cls: string; Icon: typeof CheckCircle2 }> = {
  fresh: { cls: "text-success", Icon: CheckCircle2 },
  aging: { cls: "text-accent-strong", Icon: Clock },
  stale: { cls: "text-muted", Icon: AlertTriangle },
  unknown: { cls: "text-muted", Icon: HelpCircle },
};

/** Dot + icon + text, never color alone (SPEC_V2 T2). */
export function FreshnessBadge({ freshness }: { freshness: Freshness }) {
  const { cls, Icon } = FRESHNESS_STYLE[freshness];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${cls}`}>
      <Icon size={13} strokeWidth={2.25} aria-hidden /> {FRESHNESS_LABEL[freshness]}
    </span>
  );
}

/** Round "VERIFICADO dd/mm" stamp, tilted like the seal (SPEC_V2 §9). */
export function VerifiedStamp({ at }: { at: string }) {
  return (
    <span
      className="inline-grid size-[68px] shrink-0 -rotate-[4deg] place-items-center rounded-full border-2 border-dashed border-success text-center text-success"
      aria-label={`Verificado em ${shortDate(at)}`}
    >
      <span className="text-[9px] leading-tight font-bold tracking-wider">
        VERIFICADO
        <span className="block text-sm tabular-nums">{shortDate(at)}</span>
      </span>
    </span>
  );
}

type Seals = { seal_valid_until: string | null; call_ready_valid_until: string | null };

/** "Selo Amigo do Nômade" with its validity, or "Selo vencido" (gray, with the date). */
export function SealStatus({ place, compact = false }: { place: Seals; compact?: boolean }) {
  const status = sealStatus(place);
  if (status === "none") return null;
  const until = shortDate(place.seal_valid_until!);
  if (compact) {
    return status === "active" ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary">
        <Wifi size={11} strokeWidth={2.5} aria-hidden /> Selo
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-muted">Selo vencido</span>
    );
  }
  return status === "active" ? (
    <div className="flex items-center gap-3 rounded-2xl bg-primary-soft p-3.5">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-on-fill">
        <Wifi size={20} strokeWidth={2.25} aria-hidden />
      </span>
      <p className="text-sm leading-snug">
        <strong className="block font-display text-[15px] font-bold text-primary">Selo Amigo do Nômade</strong>
        <span className="text-ink/80">Wi-Fi forte medido por 2 ou mais nômades e tomadas. Válido até {until}.</span>
      </p>
    </div>
  ) : (
    <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3.5">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-line text-muted">
        <Wifi size={20} strokeWidth={2.25} aria-hidden />
      </span>
      <p className="text-sm leading-snug text-muted">
        <strong className="block font-display text-[15px] font-bold">Selo vencido em {until}</strong>
        Ninguém confirmou o Wi-Fi nos últimos 60 dias. Meça para renovar.
      </p>
    </div>
  );
}

export function CallReadyBadge({ place }: { place: Seals }) {
  if (!isCallReady(place)) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">
      <Video size={14} strokeWidth={2.25} aria-hidden /> Pronto para chamadas
    </span>
  );
}
