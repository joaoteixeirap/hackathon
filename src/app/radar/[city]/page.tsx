import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RadarView } from "@/components/radar/RadarView";
import { AppNav } from "@/components/ui/AppNav";
import { Logo } from "@/components/ui/Logo";
import { getCity } from "@/lib/cities";
import { loadRadarPlaces } from "@/lib/radarData";

type Props = { params: Promise<{ city: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = await getCity((await params).city);
  const title = city ? `Onde trabalhar agora em ${city.name} · SoloRota` : "Radar · SoloRota";
  const description = "Cafés e coworkings ordenados por Wi-Fi medido, tomadas, ruído e chamadas, cada critério com data de verificação.";
  return { title, description, openGraph: { title, description, type: "website", locale: "pt_BR" } };
}

/** Radar "Onde trabalhar agora" (SPEC_V2 R4). */
export default async function RadarPage({ params }: Props) {
  const city = await getCity((await params).city);
  if (!city) notFound();
  const places = await loadRadarPlaces(city.id);

  return (
    <div className="min-h-dvh pb-28 lg:pb-12">
      <header className="sticky top-0 z-10 border-b border-line bg-canvas/85 backdrop-blur-md" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <Link href={`/mapa/${city.slug}`} aria-label="SoloRota, voltar ao mapa" className="flex min-h-11 items-center">
            <Logo size={30} />
          </Link>
          <Link href={`/mapa/${city.slug}`} className="hidden min-h-11 items-center rounded-full px-3 text-sm font-semibold hover:bg-surface-2 lg:inline-flex">
            Mapa
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4">
        <h1 className="mt-6 font-display text-[30px] leading-[1.1] font-bold tracking-[-0.02em]">Onde trabalhar agora</h1>
        <p className="mt-1 mb-5 text-muted">
          Cafés e coworkings de {city.name}, com Wi-Fi medido por nômades e a data de cada verificação.
        </p>
        <RadarView
          city={{ slug: city.slug, name: city.name, bbox: city.bbox, center_lat: city.center_lat, center_lng: city.center_lng, zoom: city.zoom }}
          places={places}
        />
      </main>
      <AppNav active="radar" citySlug={city.slug} />
    </div>
  );
}
