"use client";

import { Check, X } from "lucide-react";
import { useState, useTransition } from "react";
import { decideJoin } from "@/app/atividade/[id]/actions";
import type { Person } from "@/lib/membership";
import { PersonRow } from "./PersonRow";

/** Creator's queue of pending requests (F4). Approval past capacity is refused by the database. */
export function JoinQueue({ activityId, requests, spots, verificationRequired }: { activityId: string; requests: Person[]; spots: number; verificationRequired: boolean }) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = (userId: string, decision: "approved" | "declined") =>
    startTransition(async () => {
      setBusy(userId);
      setError(null);
      const res = await decideJoin(activityId, userId, decision);
      if (!res.ok) setError(res.message);
      setBusy(null);
    });

  if (requests.length === 0) {
    return <p className="text-sm text-muted">Nenhum pedido pendente. Mande o link da roda no WhatsApp para chamar gente.</p>;
  }

  return (
    <div>
      <ul className="divide-y divide-line">
        {requests.map((p) => (
          <PersonRow key={p.user_id} person={p} verificationRequired={verificationRequired}>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending || spots === 0}
                onClick={() => decide(p.user_id, "approved")}
                aria-label={`Aprovar ${p.display_name}`}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-on-fill shadow-soft-sm transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              >
                <Check size={16} strokeWidth={2.25} aria-hidden /> {busy === p.user_id ? "…" : "Aprovar"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => decide(p.user_id, "declined")}
                aria-label={`Recusar ${p.display_name}`}
                className="grid size-11 place-items-center rounded-full border border-line bg-surface text-ink transition hover:bg-surface-2 active:scale-95 disabled:opacity-50"
              >
                <X size={16} strokeWidth={2.25} aria-hidden />
              </button>
            </div>
          </PersonRow>
        ))}
      </ul>
      {spots === 0 && <p className="mt-2 text-sm font-semibold text-muted">A roda está lotada; não dá para aprovar mais ninguém.</p>}
      <p role="status" className="mt-2 text-sm text-danger empty:hidden">
        {error}
      </p>
    </div>
  );
}
