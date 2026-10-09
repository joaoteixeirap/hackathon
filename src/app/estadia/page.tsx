import type { Metadata } from "next";
import Link from "next/link";
import { AppNav } from "@/components/ui/AppNav";
import { PageShell } from "@/components/ui/PageShell";
import { card } from "@/components/ui/styles";
import { defaultCitySlug } from "@/lib/cities";

export const metadata: Metadata = { title: "Minha estadia · SoloRota" };

/** Placeholder until V3 (SPEC_V2 E1) brings the stay, checklist and favorites. */
export default function StayPage() {
  return (
    <PageShell title="Minha estadia">
      <p className={`${card} p-5`}>
        Em breve: dias na cidade, checklist de chegada, favoritos e agenda. Enquanto isso, veja{" "}
        <Link href={`/radar/${defaultCitySlug}`} className="font-semibold text-primary underline-offset-4 hover:underline">
          onde trabalhar agora
        </Link>
        .
      </p>
      <AppNav active="stay" citySlug={defaultCitySlug} />
    </PageShell>
  );
}
