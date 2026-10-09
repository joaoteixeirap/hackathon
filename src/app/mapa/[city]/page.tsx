import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapExperience } from "@/components/map/MapExperience";
import { getCity } from "@/lib/cities";
import { loadMapData } from "@/lib/mapData";

type Props = { params: Promise<{ city: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = await getCity((await params).city);
  return {
    title: city ? `SoloRota · ${city.name}` : "SoloRota",
    description: city
      ? `Onde trabalhar, comer, ser atendido e encontrar gente em ${city.name}: o mapa do nômade digital.`
      : undefined,
  };
}

export default async function MapPage({ params }: Props) {
  const city = await getCity((await params).city);
  if (!city) notFound();
  const { places, activities } = await loadMapData(city.id);

  return <MapExperience city={city} places={places} activities={activities} />;
}
