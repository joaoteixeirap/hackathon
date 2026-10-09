import type { Metadata } from "next";
import { PageShell } from "@/components/ui/PageShell";
import { TrackView } from "@/components/ui/TrackView";
import { listCities } from "@/lib/cities";
import { ExploreDirectory } from "./ExploreDirectory";

export const metadata: Metadata = { title: "Cidades e ferramentas · SoloRota" };

export default async function ExplorePage() {
  return <PageShell title="Cidades e ferramentas">
    <TrackView name="explore_view" props={{}} />
    <p className="mb-5 text-sm text-muted">Explore as cidades cadastradas e organize sua rotina com ferramentas úteis. Todas as funções do SoloRota são gratuitas para nômades.</p>
    <ExploreDirectory cities={await listCities()} />
  </PageShell>;
}
