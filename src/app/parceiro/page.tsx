import { ChevronRight, Clock, Plus, Sparkles, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORY_BG, CategoryIcon } from "@/components/ui/CategoryIcon";
import { PageShell } from "@/components/ui/PageShell";
import { buttonAccent, card } from "@/components/ui/styles";
import { getUser } from "@/lib/auth";
import { getMyPartner, getPartnerPlaces, isFeatured } from "@/lib/partner";
import { subcategoryLabel } from "@/lib/places";
import { PartnerSignUpForm } from "./PartnerSignUpForm";
import { PartnerSessions } from "@/components/stay/PartnerSessions";

export const metadata: Metadata = { title: "Painel do parceiro · SoloRota" };
export const dynamic = "force-dynamic";

export default async function PartnerPage() {
  const user = await getUser();
  if (!user) {
    return (
      <PageShell title="Painel do parceiro">
        <p className={`${card} p-5`}>Não conseguimos abrir sua sessão agora. Recarregue a página em instantes.</p>
      </PageShell>
    );
  }
  const partner = await getMyPartner(user.id);

  if (!partner) {
    return (
      <PageShell title="Seu negócio no mapa dos nômades">
        <ul className="-mt-2 mb-6 space-y-2 text-[15px]">
          <li>• Apareça para quem trabalha remoto em Santos e procura onde trabalhar, comer e se cuidar.</li>
          <li>• Publique ofertas para preencher mesas, vagas e horários ociosos.</li>
          <li>• Veja quantas pessoas usaram cada oferta.</li>
        </ul>
        <section className={`${card} p-5`} aria-label="Cadastro do negócio">
          <PartnerSignUpForm />
        </section>
      </PageShell>
    );
  }

  if (!partner.approved) {
    return (
      <PageShell title={partner.business_name}>
        <p className={`${card} flex items-start gap-3 p-5`}>
          <Clock size={20} className="mt-0.5 shrink-0 text-muted" aria-hidden />
          <span>
            <span className="font-semibold">Cadastro em análise.</span> A equipe confere seu negócio e libera o painel em até um dia útil.
          </span>
        </p>
      </PageShell>
    );
  }

  const places = await getPartnerPlaces(partner.id);

  return (
    <PageShell title={partner.business_name}>
      <p className="-mt-3 mb-5 flex items-center gap-2 text-sm text-muted">
        <Store size={16} aria-hidden /> Painel do parceiro · plano {partner.plan === "destaque" ? "Destaque" : "Grátis"}
      </p>

      <section aria-labelledby="places-title" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="places-title" className="font-display text-xl font-bold">
            Seus lugares
          </h2>
          <Link href="/parceiro/lugares/novo" className={`${buttonAccent} min-h-11 gap-1.5 px-4 text-sm`}>
            <Plus size={16} strokeWidth={2.5} aria-hidden /> Adicionar lugar
          </Link>
        </div>

        {places.length === 0 ? (
          <p className={`${card} p-5 text-muted`}>
            Nenhum lugar ainda. Procure seu negócio entre os lugares do mapa ou cadastre um novo.
          </p>
        ) : (
          <ul className={`${card} divide-y divide-line`}>
            {places.map((p) => (
              <li key={p.id}>
                <Link href={`/parceiro/lugar/${p.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-surface-2">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-xl text-white ${CATEGORY_BG[p.category]}`}>
                    <CategoryIcon category={p.category} subcategory={p.subcategory} size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{p.name}</span>
                    <span className="block text-sm text-muted">
                      {subcategoryLabel(p)}
                      {p.neighborhood && ` · ${p.neighborhood}`}
                    </span>
                  </span>
                  {isFeatured(p) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-1 text-xs font-semibold text-accent-strong">
                      <Sparkles size={12} aria-hidden /> Destaque
                    </span>
                  )}
                  <ChevronRight size={18} className="text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      {places.map(p => <div key={p.id}><p className="mt-6 font-semibold">{p.name}</p><PartnerSessions placeId={p.id} /></div>)}
    </PageShell>
  );
}
