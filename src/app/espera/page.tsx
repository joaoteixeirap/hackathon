import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { cleanUtm, isBlock } from "@/lib/analytics";
import { defaultCitySlug, getCity, listCities } from "@/lib/cities";
import { EsperaClient } from "./EsperaClient";

const title = "SoloRota · lista de espera";
const description = "O mapa dos nômades digitais no Brasil: rodas em grupo, onde trabalhar com Wi-Fi bom, saúde e moradia. Entre na lista.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website", locale: "pt_BR", siteName: "SoloRota" },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function WaitlistPage({ searchParams }: Props) {
  const sp = await searchParams;
  const [city, cities] = await Promise.all([getCity(defaultCitySlug), listCities()]);
  const bloco = Array.isArray(sp.bloco) ? sp.bloco[0] : sp.bloco;
  const cityName = city?.name ?? "sua cidade";

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 max-w-xl items-center justify-between px-4" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <Logo size={30} />
        <Link href="/" className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold hover:bg-surface-2">
          Ver o mapa
        </Link>
      </header>
      <main className="mx-auto max-w-xl px-4 pb-16">
        <p className="mt-4 text-sm font-semibold text-accent-strong">Piloto em {cityName}</p>
        <h1 className="mt-1 font-display text-[36px] leading-[1.05] font-bold tracking-[-0.02em] text-balance">
          A cidade nova fica mais fácil quando você não chega sozinho.
        </h1>
        <p className="mt-3 mb-6 text-lg text-muted">
          O SoloRota é o mapa dos nômades digitais no Brasil. Qual destes problemas você mais quer resolver?
        </p>

        <EsperaClient
          cityName={cityName}
          cities={cities.map((c) => ({ slug: c.slug, name: c.name }))}
          defaultCity={city?.slug ?? defaultCitySlug}
          utmSource={cleanUtm(sp.utm_source)}
          utmCampaign={cleanUtm(sp.utm_campaign)}
          initialBlock={isBlock(bloco) ? bloco : null}
        />

        <p className="mt-8 text-xs text-muted">
          Contamos visitas com um identificador anônimo guardado só neste aparelho, sem cookies de terceiros. Dados do mapa © OpenStreetMap contributors.{" "}
          <Link href="/sobre" className="font-semibold underline underline-offset-4">
            Privacidade e fontes
          </Link>
        </p>
      </main>
    </div>
  );
}
