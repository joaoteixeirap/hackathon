import type { Metadata } from "next";
import { BadgeCheck, ChevronRight, Compass, Info, LogIn, LogOut, Luggage, Mail, Sparkles, Store, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { RoutineForm, type RoutineValues } from "@/components/stay/RoutineForm";
import { AppNav } from "@/components/ui/AppNav";
import { DemoLogin } from "@/components/ui/DemoLogin";
import { PageShell } from "@/components/ui/PageShell";
import { Rating } from "@/components/ui/Rating";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { buttonSecondary, card } from "@/components/ui/styles";
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

  const initials = profile.display_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const since = new Date(profile.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
  const roleLabel = profile.role === "partner" ? "Parceiro" : profile.role === "admin" ? "Equipe" : "Nômade";

  return (
    <PageShell title="Meu perfil" wide>
      <div className="space-y-5 lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-6 lg:space-y-0">
        <aside className="space-y-5 lg:sticky lg:top-24">
          <section className={`${card} overflow-hidden`} aria-label="Resumo">
            <div
              className="h-24"
              style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 45%, var(--accent)))" }}
              aria-hidden
            />
            <div className="px-5 pb-5">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className="-mt-11 size-[88px] rounded-full border-4 border-surface object-cover" />
              ) : (
                <span className="-mt-11 grid size-[88px] place-items-center rounded-full border-4 border-surface bg-primary-soft font-display text-3xl font-bold text-primary" aria-hidden>
                  {initials || "?"}
                </span>
              )}
              <p className="mt-3 font-display text-2xl leading-tight font-bold break-words">{profile.display_name}</p>
              <p className="mt-1 text-sm text-muted break-words">
                {user.is_anonymous ? "Você está como visitante neste aparelho. Escolha um nome para o grupo te reconhecer." : user.email}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink">{roleLabel}</span>
                <VerifiedBadge verified={profile.verified} required={verification.required} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
                <div>
                  <dt className="text-xs text-muted">Avaliações</dt>
                  <dd className="mt-0.5">
                    <Rating avg={rating.avg} count={rating.count} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">No SoloRota desde</dt>
                  <dd className="mt-0.5 font-semibold">{since}</dd>
                </div>
              </dl>
              {!profile.verified && (
                <Link href="/verificar" className={`${buttonSecondary} mt-4 min-h-11 w-full gap-2 text-sm`}>
                  <BadgeCheck size={17} aria-hidden />
                  {verification.pending ? "Verificação em análise" : "Verificar meu perfil"}
                </Link>
              )}
              {!user.is_anonymous && (
                <form action={signOut} className="mt-2">
                  <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-muted transition hover:bg-surface-2 hover:text-ink">
                    <LogOut size={16} aria-hidden /> Sair desta conta
                  </button>
                </form>
              )}
            </div>
          </section>
        </aside>

        <div className="space-y-5">
          {user.is_anonymous && (
            <section className={`${card} space-y-4 p-5 sm:p-6`} aria-label="Entrar">
              <SectionHeader icon={<LogIn size={18} aria-hidden />} title="Guarde seu perfil numa conta" text="Como visitante, seus dados ficam só neste aparelho. Entre para usar em qualquer lugar." />
              {demoLoginEnabled() && <DemoLogin next="/perfil" />}
              <Link href="/entrar?next=/perfil" className={`${buttonSecondary} min-h-11 gap-2 text-sm`}>
                <Mail size={16} aria-hidden /> Entrar com e-mail
              </Link>
            </section>
          )}

          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_288px] lg:items-start lg:gap-5">
            <section className={`${card} space-y-5 p-5 sm:p-6`} aria-label="Editar perfil">
              <SectionHeader icon={<UserRound size={18} aria-hidden />} title="Sobre você" text="É assim que as pessoas te veem nas rodas e nos grupos." />
              <ProfileForm profile={profile} />
            </section>
            <QuickLinks className="hidden lg:block" />
          </div>

          <section className={`${card} space-y-5 p-5 sm:p-6`} aria-labelledby="routine-title">
            <SectionHeader
              id="routine-title"
              icon={<Sparkles size={18} aria-hidden />}
              title="Rotina, interesses e privacidade"
              text={
                <>
                  Usamos isso para sugerir rodas e pessoas compatíveis. Cidade e datas ficam na{" "}
                  <Link href="/estadia" className="font-semibold text-primary underline-offset-4 hover:underline">
                    sua estadia
                  </Link>
                  .
                </>
              }
            />
            <RoutineForm wide initial={routine} neighborhoods={cities.find((c) => c.id === profile.current_city_id)?.neighborhoods ?? []} />
          </section>

          <QuickLinks className="lg:hidden" />
        </div>
      </div>

      <AppNav active="profile" citySlug={defaultCitySlug} />
    </PageShell>
  );
}

function SectionHeader({ id, icon, title, text }: { id?: string; icon: React.ReactNode; title: string; text: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">{icon}</span>
      <div className="min-w-0">
        <h2 id={id} className="font-display text-xl leading-tight font-bold">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted">{text}</p>
      </div>
    </div>
  );
}

const LINKS = [
  { href: "/estadias", icon: Luggage, title: "Minhas estadias", text: "Cidades que você planeja e onde está" },
  { href: "/comunidades", icon: Users, title: "Comunidades", text: "Seus grupos por cidade" },
  { href: "/parceiro", icon: Store, title: "Painel do parceiro", text: "Tem um negócio? Coloque no mapa" },
  { href: "/explorar", icon: Compass, title: "Cidades e ferramentas", text: "Destinos e rotina nômade" },
  { href: "/sobre", icon: Info, title: "Sobre e privacidade", text: "Como usamos seus dados e as fontes" },
] as const;

function QuickLinks({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Atalhos do perfil" className={`${card} overflow-hidden ${className}`}>
      <ul className="divide-y divide-line">
        {LINKS.map(({ href, icon: Icon, title, text }) => (
          <li key={href}>
            <Link href={href} className="flex min-h-16 items-center gap-3 px-4 py-3 transition hover:bg-surface-2">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink">
                <Icon size={17} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{title}</span>
                <span className="block text-xs text-muted">{text}</span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
