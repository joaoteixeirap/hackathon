import type { Metadata } from "next";
import { PageShell } from "@/components/ui/PageShell";
import { Rating } from "@/components/ui/Rating";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { buttonSecondary, card } from "@/components/ui/styles";
import { getMyProfile, requireUser } from "@/lib/auth";
import { getProfileRating } from "@/lib/ratings";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { ProfileForm } from "./ProfileForm";

export const metadata: Metadata = { title: "Meu perfil · SoloRota" };
export const dynamic = "force-dynamic";

export default async function MyProfilePage() {
  const user = await requireUser("/perfil");
  const supabase = await createClient();
  const [profile, rating, { data: cities }] = await Promise.all([
    getMyProfile(),
    getProfileRating(user.id),
    supabase.from("cities").select("id, name").order("name"),
  ]);

  if (!profile) {
    return (
      <PageShell title="Meu perfil">
        <p className={`${card} p-5`}>Não encontramos seu perfil. Tente sair e entrar de novo.</p>
      </PageShell>
    );
  }

  return (
    <PageShell title="Meu perfil">
      <section className={`${card} mb-6 space-y-2 p-5`} aria-label="Resumo">
        <p className="font-serif text-2xl font-bold">{profile.display_name}</p>
        <p className="text-sm text-tinta-suave">{user.email}</p>
        <div className="flex flex-wrap items-center gap-3">
          <VerifiedBadge verified={profile.verified} />
          <Rating avg={rating.avg} count={rating.count} />
        </div>
      </section>

      <section className={`${card} p-5`} aria-label="Editar perfil">
        <ProfileForm profile={profile} cities={cities ?? []} />
      </section>

      <form action={signOut} className="mt-6">
        <button type="submit" className={buttonSecondary}>
          Sair
        </button>
      </form>
    </PageShell>
  );
}
