import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { Rating } from "@/components/ui/Rating";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { card } from "@/components/ui/styles";
import { getMyProfile, getUser } from "@/lib/auth";
import { getProfileRating } from "@/lib/ratings";
import { createClient } from "@/lib/supabase/server";
import { getVerificationState } from "@/lib/verification";
import { ProfileForm } from "./ProfileForm";

export const metadata: Metadata = { title: "Meu perfil · SoloRota" };
export const dynamic = "force-dynamic";

export default async function MyProfilePage() {
  const user = await getUser();
  if (!user) {
    return (
      <PageShell title="Meu perfil">
        <p className={`${card} p-5`}>
          Não conseguimos abrir sua sessão de visitante agora. Recarregue a página em instantes.
        </p>
      </PageShell>
    );
  }
  const supabase = await createClient();
  const [profile, rating, { data: cities }, verification] = await Promise.all([
    getMyProfile(),
    getProfileRating(user.id),
    supabase.from("cities").select("id, name").order("name"),
    getVerificationState(user.id),
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
        <p className="font-display text-2xl font-bold">{profile.display_name}</p>
        <p className="text-sm text-muted">
          {user.is_anonymous
            ? "Você está como visitante neste aparelho. Escolha um nome para o grupo te reconhecer."
            : user.email}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <VerifiedBadge verified={profile.verified} required={verification.required} />
          <Rating avg={rating.avg} count={rating.count} />
        </div>
        {!profile.verified && (
          <Link href="/verificar" className="inline-flex min-h-11 items-center text-sm font-bold text-primary underline-offset-4 hover:underline">
            {verification.pending ? "Verificação em análise" : "Verificar meu perfil"}
          </Link>
        )}
      </section>

      <section className={`${card} p-5`} aria-label="Editar perfil">
        <ProfileForm profile={profile} cities={cities ?? []} />
      </section>

      <Link href="/parceiro" className={`${card} mt-6 flex min-h-16 items-center justify-between gap-3 p-5 hover:bg-surface-2`}>
        <span>
          <span className="block font-semibold">Tem um negócio na cidade?</span>
          <span className="block text-sm text-muted">Coloque seu lugar e suas ofertas no mapa dos nômades.</span>
        </span>
        <span className="text-sm font-bold text-primary">Painel do parceiro</span>
      </Link>

    </PageShell>
  );
}
