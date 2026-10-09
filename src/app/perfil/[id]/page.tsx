import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/components/ui/PageShell";
import { Rating } from "@/components/ui/Rating";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { card } from "@/components/ui/styles";
import { getUser } from "@/lib/auth";
import { getProfileRating } from "@/lib/ratings";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Perfil · SoloRota" };

type Props = { params: Promise<{ id: string }> };

export default async function ProfilePage({ params }: Props) {
  const { id } = await params;
  const user = await getUser();
  if (id === user?.id) redirect("/perfil");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: profile }, rating] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, bio, home_country, languages, verified, current_city:cities(name)")
      .eq("id", id)
      .maybeSingle(),
    getProfileRating(id),
  ]);
  if (!profile) notFound();
  const city = profile.current_city as unknown as { name: string } | null;

  return (
    <PageShell title={profile.display_name}>
      <section className={`${card} space-y-3 p-5`}>
        <div className="flex flex-wrap items-center gap-3">
          <VerifiedBadge verified={profile.verified} />
          <Rating avg={rating.avg} count={rating.count} />
        </div>
        {profile.bio && <p>{profile.bio}</p>}
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-tinta-suave">País de origem</dt>
          <dd className="font-mono">{profile.home_country ?? "—"}</dd>
          <dt className="text-tinta-suave">Idiomas</dt>
          <dd className="font-mono">{(profile.languages ?? []).join(", ") || "—"}</dd>
          <dt className="text-tinta-suave">Cidade atual</dt>
          <dd>{city?.name ?? "—"}</dd>
        </dl>
      </section>
    </PageShell>
  );
}
