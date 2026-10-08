import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapView } from "@/components/map/MapView";
import { Logo } from "@/components/ui/Logo";
import { getCity } from "@/lib/cities";

type Props = { params: Promise<{ city: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = await getCity((await params).city);
  return { title: city ? `SoloRota · ${city.name}` : "SoloRota" };
}

export default async function MapPage({ params }: Props) {
  const city = await getCity((await params).city);
  if (!city) notFound();

  return (
    <main className="fixed inset-0 overflow-hidden">
      <MapView city={city} />
      <header className="pointer-events-none absolute inset-x-0 top-0 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex h-12 items-center gap-3 rounded-full border border-tinta/15 bg-papel-claro px-4 shadow-[0_2px_0_rgb(31_42_48/0.1)]">
          <Logo />
          <span className="truncate text-sm text-tinta-suave">{city.name}</span>
        </div>
      </header>
    </main>
  );
}
