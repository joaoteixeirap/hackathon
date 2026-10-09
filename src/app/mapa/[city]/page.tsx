import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { preconnect, preload } from "react-dom";
import { MapExperience, type Selection } from "@/components/map/MapExperience";
import { STYLE_URL } from "@/components/map/style";
import { getCity } from "@/lib/cities";
import { loadMapData } from "@/lib/mapData";
import { CHIP_ORDER } from "@/lib/places";

type Props = {
  params: Promise<{ city: string }>;
  searchParams: Promise<{ lugar?: string; atividade?: string; cat?: string; sub?: string; hours?: string; pass?: string }>;
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
  // Start the basemap downloads with the HTML instead of after the JS bundle runs.
  preconnect(new URL(STYLE_URL).origin, { crossOrigin: "anonymous" });
  preload(STYLE_URL, { as: "fetch", crossOrigin: "anonymous" });
  const [{ city: slug }, { lugar, atividade, cat, sub, hours, pass }] = await Promise.all([params, searchParams]);
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

  // ?cat= opens the map on one chip (checklist "Abrir no mapa", SPEC_V2 E2).
  const initialChip = CHIP_ORDER.find((c) => c === cat) ?? null;
  const initialEssential = sub && ["pharmacy","hospital","coworking","laundry","supermarket"].includes(sub) ? {sub,always:hours==="24",pass:pass==="1"} : null;
  return <MapExperience city={mapCity} places={places} activities={activities} initialSelection={initialSelection} initialChip={initialChip} initialEssential={initialEssential} />;
}
