"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { factLine, freshnessOf, type FactField, type FactMeta } from "@/lib/trust";
import { FreshnessBadge } from "./TrustBadges";

type Props = {
  field: FactField;
  label: string;
  icon: React.ReactNode;
  /** The value; null shows "Sem verificação ainda". */
  value: React.ReactNode | null;
  meta: FactMeta | undefined;
  /** Measured (Wi-Fi) vs reported (others), for the source label. */
  measured?: boolean;
  /** Extra line under the value (e.g. "(declarado: 100 Mbps)"). */
  note?: React.ReactNode;
  onVote?: (field: FactField, vote: "confirm" | "outdated") => Promise<string | null>;
};

/**
 * One local fact with its source, date and confirmations (SPEC_V2 T1, I2), plus
 * "Confirmar" / "Desatualizado". Votes are anonymous; the count updates right away.
 */
export function FactRow({ field, label, icon, value, meta, measured = false, note, onVote }: Props) {
  const [state, setState] = useState<{ pending: boolean; message: string | null; voted: boolean }>({ pending: false, message: null, voted: false });
  const known = value != null && meta != null;

  async function vote(v: "confirm" | "outdated") {
    if (!onVote) return;
    setState({ pending: true, message: null, voted: false });
    const error = await onVote(field, v);
    setState({ pending: false, message: error ?? (v === "confirm" ? "Obrigado por confirmar." : "Obrigado, vamos sinalizar."), voted: !error });
  }

  return (
    <div className="rounded-2xl bg-surface-2 p-3" data-fact={field}>
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
          {icon}
          {label}
        </p>
        <FreshnessBadge freshness={freshnessOf(known ? meta : undefined)} />
      </div>
      <div className="mt-1 text-[15px] font-semibold">{value ?? <span className="font-normal text-muted">Sem verificação ainda</span>}</div>
      {note && <p className="text-xs text-muted">{note}</p>}
      <p className="mt-0.5 text-xs text-muted">{factLine(known ? meta : undefined, { measured })}</p>
      {known && onVote && !state.voted && (
        <div className="mt-1.5 flex gap-1">
          <button
            type="button"
            disabled={state.pending}
            onClick={() => vote("confirm")}
            aria-label={`Confirmar ${label.toLowerCase()}`}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-primary hover:bg-surface disabled:opacity-50"
          >
            <ThumbsUp size={14} aria-hidden /> Confirmar
          </button>
          <button
            type="button"
            disabled={state.pending}
            onClick={() => vote("outdated")}
            aria-label={`Marcar ${label.toLowerCase()} como desatualizado`}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-muted hover:bg-surface disabled:opacity-50"
          >
            <ThumbsDown size={14} aria-hidden /> Desatualizado
          </button>
        </div>
      )}
      <p role="status" className={`text-xs empty:hidden ${state.voted ? "text-success" : "text-danger"}`}>
        {state.message}
      </p>
    </div>
  );
}
