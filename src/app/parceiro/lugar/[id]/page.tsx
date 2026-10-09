import { ArrowLeft, Ticket } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/components/ui/PageShell";
import { card } from "@/components/ui/styles";
import { getUser } from "@/lib/auth";
import { OFFER_LABELS } from "@/lib/offers";
import { getMyPartner, getPartnerPlace } from "@/lib/partner";
import { subcategoryLabel } from "@/lib/places";
import { FeatureButton, OfferForm, OfferToggle, StayPolicyForm } from "./PlaceControls";

export const metadata: Metadata = { title: "Meu lugar · SoloRota" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ novo?: string }> };

const fmtDate = (d: string) => new Date(`${d}T12:00:00-03:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export default async function PartnerPlacePage({ params, searchParams }: Props) {
  const [{ id }, { novo }] = await Promise.all([params, searchParams]);
  const user = await getUser();
  const partner = user ? await getMyPartner(user.id) : null;
  if (!partner?.approved) redirect("/parceiro");
  const data = await getPartnerPlace(partner.id, id);
  if (!data) notFound();
  const { place, offers, redemptions } = data;

  return (
    <PageShell title={place.name}>
      <p className="-mt-3 mb-5 flex flex-wrap items-center gap-x-3 text-sm text-muted">
        {subcategoryLabel(place)}
        {place.neighborhood && ` · ${place.neighborhood}`}
        <Link href={`/lugar/${place.id}`} className="font-semibold text-primary underline-offset-4 hover:underline">
          Ver ficha pública
        </Link>
      </p>

      {novo && (
        <div role="status" className="mb-5 rounded-3xl bg-accent p-5 text-white shadow-soft-md">
          <p className="font-display text-lg font-bold">Lugar no mapa!</p>
          <p className="text-sm">Agora publique uma oferta para atrair nômades.</p>
        </div>
      )}

      <section className={`${card} p-5`} aria-labelledby="feature-title">
        <h2 id="feature-title" className="mb-2 font-display text-xl font-bold">
          Destaque
        </h2>
        <FeatureButton placeId={place.id} featuredUntil={place.featured_until} />
      </section>

      <section className={`${card} mt-6 p-5`} aria-labelledby="rules-title">
        <h2 id="rules-title" className="mb-1 font-display text-xl font-bold">
          Regras do local
        </h2>
        <p className="mb-3 text-sm text-muted">Aparece no Radar e na ficha como &quot;Declarado pelo local&quot;, e vale sobre o que os nômades relatam.</p>
        <StayPolicyForm placeId={place.id} policy={place.stay_policy} note={place.stay_note} />
      </section>

      <section className={`${card} mt-6 p-5`} aria-labelledby="offers-title">
        <h2 id="offers-title" className="mb-3 font-display text-xl font-bold">
          Ofertas
        </h2>
        {offers.length === 0 ? (
          <p className="mb-4 text-sm text-muted">Nenhuma oferta ainda.</p>
        ) : (
          <ul className="mb-5 divide-y divide-line">
            {offers.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-accent-strong">
                    {OFFER_LABELS[o.kind]}
                    {!o.active && <span className="ml-2 text-muted">pausada</span>}
                  </p>
                  <p className="font-semibold">{o.title}</p>
                  <p className="text-sm text-muted tabular-nums">
                    Código <span className="font-bold tracking-wider text-ink">{o.code}</span>
                    {o.valid_to && ` · até ${fmtDate(o.valid_to)}`}
                    {" · "}
                    {o.redemptions} {o.redemptions === 1 ? "resgate" : "resgates"}
                    {o.capacity != null && ` de ${o.capacity}`} · {o.redemptions_today} hoje
                  </p>
                </div>
                <OfferToggle placeId={place.id} offerId={o.id} active={o.active} title={o.title} />
              </li>
            ))}
          </ul>
        )}
        <h3 className="mb-3 font-semibold">Nova oferta</h3>
        <OfferForm placeId={place.id} />
      </section>

      <section className={`${card} mt-6 p-5`} aria-labelledby="redemptions-title">
        <h2 id="redemptions-title" className="mb-1 font-display text-xl font-bold">
          Resgates
        </h2>
        <p className="mb-3 text-sm text-muted">Só o primeiro nome de quem usou, por privacidade. Confira o código no caixa.</p>
        {redemptions.length === 0 ? (
          <p className="text-sm text-muted">Ninguém usou suas ofertas ainda.</p>
        ) : (
          <ul className="divide-y divide-line">
            {redemptions.map((r) => (
              <li key={`${r.offer_id}-${r.created_at}`} className="flex items-center gap-3 py-2.5 text-sm">
                <Ticket size={16} className="shrink-0 text-accent-strong" aria-hidden />
                <span className="font-semibold">{r.first_name}</span>
                <span className="min-w-0 flex-1 truncate text-muted">{r.offer_title}</span>
                <span className="tabular-nums text-muted">
                  {fmtDate(r.redeemed_on)}, {fmtTime(r.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link href="/parceiro" className="mt-6 inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-primary">
        <ArrowLeft size={16} aria-hidden /> Seus lugares
      </Link>
    </PageShell>
  );
}
