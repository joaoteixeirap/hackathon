"use client";
import { useState, useTransition } from "react";
import { redeemOffer } from "@/app/lugar/[id]/actions";
import { groupBenefitState } from "@/lib/journey";
import { buttonPrimary } from "@/components/ui/styles";
import { OfferTicket } from "./OfferTicket";
export function GroupBenefitTicket({ activityId, offer, count, starts, ends, participant }: { activityId: string; offer: { id: string; title: string; min_group: number }; count: number; starts: string; ends: string; participant: boolean }) {
  const status = groupBenefitState(count, offer.min_group, starts, ends);
  const [ticket, setTicket] = useState<{ code: string; expiresAt: string } | null>(null);
  const [error, setError] = useState("");
  const [pending, run] = useTransition();
  return <section className="space-y-2 rounded-2xl bg-accent-soft p-4" aria-label="Benefício do grupo">
    <p className="font-semibold">Benefício do grupo: {offer.title}</p>
    <p className="text-sm">Para {offer.min_group} ou mais pessoas · {status.missing ? `faltam ${status.missing}` : "grupo completo"}</p>
    <div role="progressbar" aria-label="Pessoas para o benefício" aria-valuemin={0} aria-valuemax={offer.min_group} aria-valuenow={Math.min(count, offer.min_group)} className="h-2 rounded-full bg-surface"><div className="h-full rounded-full bg-primary" style={{ width: `${status.fraction * 100}%` }} /></div>
    <p className="text-xs text-muted">Disponível de 30 minutos antes do início até o fim. Declarado pelo local.</p>
    {ticket ? <OfferTicket {...ticket} title={offer.title} /> : <button type="button" disabled={!status.available || !participant || pending} className={buttonPrimary} onClick={() => run(async () => { const r = await redeemOffer(offer.id, activityId); if (r.ok) setTicket(r); else setError(r.message); })}>Usar benefício do grupo</button>}
    <p role="status" className="text-sm text-danger empty:hidden">{error}</p>
  </section>;
}
