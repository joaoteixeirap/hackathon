import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/ui/PageShell";
import { card } from "@/components/ui/styles";
import { defaultCitySlug, getCity } from "@/lib/cities";
import { loadPlace } from "@/lib/mapData";
import type { PlaceTrust } from "@/lib/placeTrust";
import { CreateActivityForm } from "./CreateActivityForm";

export const metadata: Metadata = { title: "Criar roda · SoloRota" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ lugar?: string; cidade?: string }> };

export default async function NewActivityPage({ searchParams }: Props) {
  const { lugar, cidade } = await searchParams;
  const placeData = lugar ? await loadPlace(lugar) : null;
  const city = await getCity(placeData?.citySlug || cidade || defaultCitySlug);
  if (!city) notFound();

  const place = placeData?.place;
  const prefill = place
    ? { lat: place.lat, lng: place.lng, label: place.name, placeId: place.id, zoom: 16 }
    : { lat: city.center_lat, lng: city.center_lng, label: null, placeId: null, zoom: 14 };

  return (
    <PageShell title="Criar um rolê em grupo">
      <p className="-mt-3 mb-5 text-muted">
        Em {city.name}. A roda aparece no mapa para outros nômades na hora.
      </p>
      <div className={`${card} p-5`}>
        <CreateActivityForm citySlug={city.slug} bbox={city.bbox} prefill={prefill} stayNotice={stayNotice(placeData?.trust)} />
      </div>
    </PageShell>
  );
}

/** R5: warn when the venue asks for something to stay (consumption, time limit, pass). */
function stayNotice(trust: PlaceTrust | null | undefined): string | null {
  if (!trust || trust.stay_policy === "unknown" || trust.stay_policy === "free") return null;
  const rule = { min_consumption: "consumo mínimo", time_limit: "limite de tempo", pass_required: "passe ou diária" }[trust.stay_policy];
  return `Este local pede ${rule}${trust.stay_note ? ` (${trust.stay_note})` : ""}. Avise o grupo na descrição.`;
}
