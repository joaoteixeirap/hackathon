import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { preconnect, preload } from "react-dom";
import { MapExperience, type Selection } from "@/components/map/MapExperience";
import { STYLE_URL } from "@/components/map/style";
import { getCity,listMapCities } from "@/lib/cities";
import { SP_BOUNDS } from "@/lib/stateMap";
import { loadMapData } from "@/lib/mapData";
import { CHIP_ORDER } from "@/lib/places";

type Props = {
  params: Promise<{ city: string }>;
  searchParams: Promise<{ lugar?: string; atividade?: string; cat?: string; sub?: string; hours?: string; pass?: string;city?:string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = await getCity((await params).city);
  if((await params).city==="sp")return {title:"Explorar São Paulo · SoloRota",description:"Planeje sua próxima estadia e encontre lugares e rodas para nômades digitais em SP."};
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
  const [{ city: slug }, { lugar, atividade, cat, sub, hours, pass,city:focusCity }] = await Promise.all([params, searchParams]);
  if(slug==="sp"){
   const cities=(await listMapCities()).filter(c=>c.state==="SP");
   const focus=focusCity?await getCity(focusCity):null;
   const center=focus?.state==="SP"?focus:{id:null,slug:"sp",name:"São Paulo",state:"SP",center_lat:-22.5,center_lng:-48.5,zoom:6.5,bbox:SP_BOUNDS};
   return <MapExperience city={center} places={[]} activities={[]} stateCities={cities}/>;
  }
  const city = await getCity(slug);
  if (!city) notFound();
  const { places, activities,truncated } = await loadMapData(city.id);

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
  const initialEssential = sub && ["pharmacy","hospital","coworking","laundry","supermarket","school","kindergarten","apartment"].includes(sub) ? {sub,always:hours==="24",pass:pass==="1"} : null;
  return <MapExperience city={mapCity} places={places} activities={activities} initialSelection={initialSelection} initialChip={initialChip} initialEssential={initialEssential} initialTruncated={truncated} />;
}
