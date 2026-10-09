import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapExperience, type Selection } from "@/components/map/MapExperience";
import { getCity } from "@/lib/cities";
import { loadMapData } from "@/lib/mapData";

type Props = {
  params: Promise<{ city: string }>;
  searchParams: Promise<{ lugar?: string; atividade?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = await getCity((await params).city);
  return {
    title: city ? `SoloRota · ${city.name}` : "SoloRota",
    description: city
      ? `Onde trabalhar, comer, ser atendido e encontrar gente em ${city.name}: o mapa do nômade digital.`
      : undefined,
  };
}

export default async function MapPage({ params, searchParams }: Props) {
  const [{ city: slug }, { lugar, atividade }] = await Promise.all([params, searchParams]);
  const city = await getCity(slug);
  if (!city) notFound();
  const { places, activities } = await loadMapData(city.id);

  const initialSelection: Selection =
    atividade && activities.some((a) => a.id === atividade)
      ? { kind: "activity", id: atividade }
      : lugar && places.some((p) => p.id === lugar)
        ? { kind: "place", id: lugar }
        : null;
  const focus = initialSelection
    ? (initialSelection.kind === "activity" ? activities : places).find((x) => x.id === initialSelection.id)
    : undefined;
  const mapCity = focus ? { ...city, center_lat: focus.lat, center_lng: focus.lng, zoom: 15.5 } : city;

  return <MapExperience city={mapCity} places={places} activities={activities} initialSelection={initialSelection} />;
}
