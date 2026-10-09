import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlaceDetail } from "@/components/sheet/PlaceDetail";
import { PageShell } from "@/components/ui/PageShell";
import { card } from "@/components/ui/styles";
import { loadPlace } from "@/lib/mapData";
import { subcategoryLabel } from "@/lib/places";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await loadPlace((await params).id);
  if (!data) return { title: "Lugar · SoloRota" };
  const { place } = data;
  const title = `${place.name} · SoloRota`;
  const description = `${subcategoryLabel(place)}${place.neighborhood ? ` em ${place.neighborhood}` : ""}. Wi-Fi, tomadas e dicas de nômades.`;
  return { title, description, openGraph: { title, description, type: "website", locale: "pt_BR" } };
}

export default async function PlacePage({ params }: Props) {
  const data = await loadPlace((await params).id);
  if (!data) notFound();

  return (
    <PageShell title="Ficha do lugar">
      <div className={`${card} p-5`}>
        <PlaceDetail place={data.place} trust={data.trust} standalone />
      </div>
      {data.citySlug && (
        <Link href={`/mapa/${data.citySlug}`} className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-primary underline-offset-4 hover:underline">
          ← Ver no mapa
        </Link>
      )}
      <p className="mt-6 text-xs text-muted">Dados do lugar © OpenStreetMap contributors, quando importados.</p>
    </PageShell>
  );
}
