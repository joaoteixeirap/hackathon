import type { Metadata } from "next";
import Link from "next/link";
import { RoutineForm, type RoutineValues } from "@/components/stay/RoutineForm";
import { AppNav } from "@/components/ui/AppNav";
import { DemoLogin } from "@/components/ui/DemoLogin";
import { PageShell } from "@/components/ui/PageShell";
import { Rating } from "@/components/ui/Rating";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { card } from "@/components/ui/styles";
import { getMyProfile, getUser } from "@/lib/auth";
import { defaultCitySlug } from "@/lib/cities";
import { demoLoginEnabled } from "@/lib/demoAccounts";
import { getCityNeighborhoods } from "@/lib/neighborhoods";
import { getProfileRating } from "@/lib/ratings";
import { createClient } from "@/lib/supabase/server";
import { getVerificationState } from "@/lib/verification";
import { signOut } from "./actions";
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
  const [profile, rating, { data: cityRows }, verification] = await Promise.all([
    getMyProfile(),
    getProfileRating(user.id),
    supabase.from("cities").select("id, name").order("name"),
    getVerificationState(user.id),
  ]);

  const cities = await Promise.all((cityRows ?? []).map(async (c) => ({ ...c, neighborhoods: await getCityNeighborhoods(c.id) })));

  const p = profile as unknown as Record<string, unknown> | null;
  const routine: RoutineValues = {
    work_rhythm: (p?.work_rhythm as RoutineValues["work_rhythm"]) ?? "flexible",
    work_style: (p?.work_style as RoutineValues["work_style"]) ?? "mixed",
    interests: (p?.interests as RoutineValues["interests"]) ?? [],
    social_goals: (p?.social_goals as RoutineValues["social_goals"]) ?? [],
    discoverable: Boolean(p?.discoverable),
    share_presence: Boolean(p?.share_presence),
    neighborhood: (p?.neighborhood as string | null) ?? null,
  };

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
        {!user.is_anonymous && (
          <form action={signOut}>
            <button type="submit" className="inline-flex min-h-11 items-center text-sm font-semibold text-muted underline-offset-4 hover:underline">
              Sair desta conta
            </button>
          </form>
        )}
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

      {user.is_anonymous && (
        <section className={`${card} mb-6 space-y-3 p-5`} aria-label="Entrar">
          {demoLoginEnabled() && <DemoLogin next="/perfil" />}
          <Link href="/entrar?next=/perfil" className="inline-flex min-h-11 items-center text-sm font-bold text-primary underline-offset-4 hover:underline">
            Entrar com e-mail
          </Link>
        </section>
      )}

      <section className={`${card} p-5`} aria-label="Editar perfil">
        <ProfileForm profile={profile} />
      </section>

      <section className={`${card} mt-6 space-y-3 p-5`} aria-labelledby="routine-title">
        <h2 id="routine-title" className="font-display text-xl font-bold">
          Rotina, interesses e privacidade
        </h2>
        <p className="text-sm text-muted">
          Cidade e datas ficam na{" "}
          <Link href="/estadia" className="font-semibold text-primary underline-offset-4 hover:underline">
            sua estadia
          </Link>
          .
        </p>
        <RoutineForm initial={routine} neighborhoods={cities.find((c) => c.id === profile.current_city_id)?.neighborhoods ?? []} />
      </section>

      <Link href="/parceiro" className={`${card} mt-6 flex min-h-16 items-center justify-between gap-3 p-5 hover:bg-surface-2`}>
        <span>
          <span className="block font-semibold">Tem um negócio na cidade?</span>
          <span className="block text-sm text-muted">Coloque seu lugar e suas ofertas no mapa dos nômades.</span>
        </span>
        <span className="text-sm font-bold text-primary">Painel do parceiro</span>
      </Link>

      <Link href="/explorar" className={`${card} mt-4 flex min-h-16 items-center justify-between gap-3 p-5 hover:bg-surface-2`}>
        <span><span className="block font-semibold">Cidades e ferramentas</span><span className="block text-sm text-muted">Explore destinos e organize sua rotina nômade.</span></span>
        <span className="font-bold text-primary" aria-hidden>↗</span>
      </Link>

      <p className="mt-6 text-center text-sm">
        <Link href="/sobre" className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
          Sobre, privacidade e fontes dos dados
        </Link>
      </p>

      <AppNav active="profile" citySlug={defaultCitySlug} />
    </PageShell>
  );
}
