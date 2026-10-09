import { Search } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/components/ui/PageShell";
import { buttonSecondary, card, field } from "@/components/ui/styles";
import { getUser } from "@/lib/auth";
import { defaultCitySlug, getCity } from "@/lib/cities";
import { getMyPartner, searchClaimablePlaces } from "@/lib/partner";
import { subcategoryLabel } from "@/lib/places";
import { ClaimButton } from "./ClaimButton";
import { NewPlaceForm } from "./NewPlaceForm";

export const metadata: Metadata = { title: "Adicionar lugar · SoloRota" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function NewPartnerPlacePage({ searchParams }: Props) {
  const user = await getUser();
  const partner = user ? await getMyPartner(user.id) : null;
  if (!partner?.approved) redirect("/parceiro");
  const city = await getCity(defaultCitySlug);
  if (!city?.id) notFound();

  const q = ((await searchParams).q ?? "").slice(0, 60);
  const results = q ? await searchClaimablePlaces(city.id, q) : [];

  return (
    <PageShell title="Adicionar lugar">
      <section className={`${card} space-y-4 p-5`} aria-labelledby="claim-title">
        <div>
          <h2 id="claim-title" className="font-display text-xl font-bold">
            Já está no mapa?
          </h2>
          <p className="text-sm text-muted">Muitos lugares de {city.name} vieram do OpenStreetMap. Procure pelo nome e assuma a ficha.</p>
        </div>
        <form className="flex gap-2" role="search">
          <label htmlFor="q" className="sr-only">
            Buscar no mapa pelo nome
          </label>
          <input id="q" name="q" defaultValue={q} minLength={2} placeholder="Nome do seu negócio" className={field} />
          <button type="submit" className={`${buttonSecondary} shrink-0 gap-2 px-4`}>
            <Search size={16} aria-hidden /> Buscar
          </button>
        </form>
        {q && (
          <ul className="divide-y divide-line" aria-label="Resultados">
            {results.length === 0 && <li className="py-3 text-sm text-muted">Nada encontrado com esse nome. Cadastre abaixo.</li>}
            {results.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.name}</p>
                  <p className="text-sm text-muted">
                    {subcategoryLabel(p)}
                    {p.neighborhood && ` · ${p.neighborhood}`}
                  </p>
                </div>
                <ClaimButton placeId={p.id} name={p.name} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${card} mt-6 space-y-4 p-5`} aria-labelledby="new-title">
        <h2 id="new-title" className="font-display text-xl font-bold">
          Cadastrar um lugar novo
        </h2>
        <NewPlaceForm citySlug={city.slug} bbox={city.bbox} center={{ lat: city.center_lat, lng: city.center_lng }} />
      </section>
    </PageShell>
  );
}
