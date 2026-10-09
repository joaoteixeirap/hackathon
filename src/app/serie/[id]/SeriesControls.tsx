"use client";

import { Check, X } from "lucide-react";
import { useState, useTransition } from "react";
import { buttonPrimary, buttonSecondary } from "@/components/ui/styles";
import { decideSeriesMember, followSeries, leaveSeries, type SeriesResult } from "./actions";

type Status = "creator" | "requested" | "approved" | "declined" | "left" | null;

function useAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<SeriesResult>) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.message);
    });
  return { pending, error, run };
}

/** Follow / pending / member state for a weekly series (S3). */
export function FollowPanel({ seriesId, status }: { seriesId: string; status: Status }) {
  const { pending, error, run } = useAction();
  if (status === "creator") return null;
  return (
    <div className="space-y-2 rounded-2xl bg-surface-2 p-4">
      {status === "approved" ? (
        <>
          <p className="font-semibold text-success">Você segue esta série e entra automaticamente nas próximas datas.</p>
          <button type="button" disabled={pending} onClick={() => run(() => leaveSeries(seriesId))} className={`${buttonSecondary} min-h-11 px-5`}>
            Deixar de seguir
          </button>
        </>
      ) : status === "requested" ? (
        <>
          <p>
            <span className="font-semibold">Pedido enviado.</span> Quem organiza aprova uma vez e você entra em todas as datas.
          </p>
          <button type="button" disabled={pending} onClick={() => run(() => leaveSeries(seriesId))} className={`${buttonSecondary} min-h-11 px-5`}>
            Cancelar pedido
          </button>
        </>
      ) : status === "declined" ? (
        <p className="text-muted">Seu pedido não foi aceito desta vez.</p>
      ) : (
        <>
          <p className="text-sm text-muted">Siga para entrar em todas as próximas datas de uma vez, sem pedir de novo a cada semana.</p>
          <button type="button" disabled={pending} onClick={() => run(() => followSeries(seriesId))} className={buttonPrimary}>
            {pending ? "Enviando…" : "Seguir a série"}
          </button>
        </>
      )}
      <p role="status" className="text-sm text-danger empty:hidden">
        {error}
      </p>
    </div>
  );
}

export function SeriesQueue({ seriesId, requests }: { seriesId: string; requests: { user_id: string; display_name: string }[] }) {
  const { pending, error, run } = useAction();
  if (requests.length === 0) return <p className="text-sm text-muted">Nenhum pedido pendente.</p>;
  return (
    <div>
      <ul className="divide-y divide-line">
        {requests.map((r) => (
          <li key={r.user_id} className="flex items-center gap-3 py-2.5">
            <span className="min-w-0 flex-1 font-semibold">{r.display_name}</span>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => decideSeriesMember(seriesId, r.user_id, "approved"))}
              aria-label={`Aprovar ${r.display_name} na série`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-on-fill disabled:opacity-50"
            >
              <Check size={16} aria-hidden /> Aprovar
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => decideSeriesMember(seriesId, r.user_id, "declined"))}
              aria-label={`Recusar ${r.display_name} na série`}
              className="grid size-11 place-items-center rounded-full border border-line"
            >
              <X size={16} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <p role="status" className="mt-2 text-sm text-danger empty:hidden">
        {error}
      </p>
    </div>
  );
}
