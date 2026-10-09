import { BadgeCheck, CalendarClock, Video } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FavoritesList } from "@/components/stay/FavoritesList";
import { PeopleList, type PersonCard } from "@/components/stay/PeopleList";
import { MicroSurvey } from "@/components/stay/MicroSurvey";
import { PostSessionBanner } from "@/components/stay/PostSessionBanner";
import { StaySetup } from "@/components/stay/StaySetup";
import { TaskList } from "@/components/stay/TaskList";
import type { RoutineValues } from "@/components/stay/RoutineForm";
import { AppNav } from "@/components/ui/AppNav";
import { PageShell } from "@/components/ui/PageShell";
import { card } from "@/components/ui/styles";
import { getMyProfile, getUser } from "@/lib/auth";
import { defaultCitySlug, getCity } from "@/lib/cities";
import { getCityNeighborhoods } from "@/lib/neighborhoods";
import { todayInBrasilia } from "@/lib/offers";
import { loadRadarPlaces } from "@/lib/radarData";
import { isCallMode, radarInput } from "@/lib/radarFilters";
import { radarScore } from "@/lib/radarScore";
import { pendingTasks, stayProgress } from "@/lib/stay";
import { getActiveStay, getCommitments, getCompatiblePeople, getFavorites, getPostSessionPrompts, getPublicActivitiesBy, getStayTasks, getWelcomeMeetup } from "@/lib/stayData";
import { createClient } from "@/lib/supabase/server";
import { CalendarDownload } from "@/components/stay/CalendarDownload";

export const metadata: Metadata = { title: "Minha estadia · SoloRota" };
export const dynamic = "force-dynamic";

const TABS = [
  ["hoje", "Hoje"],
  ["tarefas", "Tarefas"],
  ["agenda", "Agenda"],
  ["favoritos", "Favoritos"],
  ["pessoas", "Pessoas"],
] as const;
type Tab = (typeof TABS)[number][0];

type Props = { searchParams: Promise<{ aba?: string }> };

const TZ = "America/Sao_Paulo";
const weekdayOf = (iso: string) => {
  const d = new Date(iso).toLocaleDateString("pt-BR", { weekday: "long", timeZone: TZ }).replace("-feira", "");
  return ["sábado", "domingo"].includes(d) ? `no ${d}` : `na ${d}`;
};

async function loadPeople(cityId: string): Promise<PersonCard[]> {
  const people = await getCompatiblePeople(cityId);
  return Promise.all(people.map(async (p) => ({ ...p, upcoming: await getPublicActivitiesBy(p.user_id) })));
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ });

/** SPEC_V2 E1: the active stay with Hoje · Tarefas · Favoritos. */
export default async function StayPage({ searchParams }: Props) {
  const user = await getUser();
  if (!user) {
    return (
      <PageShell title="Minha estadia">
        <p className={`${card} p-5`}>Não conseguimos abrir sua sessão agora. Recarregue a página em instantes.</p>
      </PageShell>
    );
  }
  const supabase = await createClient();
  const [stay, profile, { data: cityRows }] = await Promise.all([getActiveStay(user.id), getMyProfile(), supabase.from("cities").select("id, name").order("name")]);
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
  const defaultCity = await getCity(defaultCitySlug);

  if (!stay) {
    return (
      <PageShell title="Minha estadia">
        <p className="-mt-3 mb-5 text-muted">Diga quando você chega e sai. Montamos seu checklist de chegada e sua semana na cidade.</p>
        <div className={`${card} p-5`}>
          <StaySetup cities={cities} defaultCityId={defaultCity?.id ?? null} routine={routine} />
        </div>
        <AppNav active="stay" citySlug={defaultCitySlug} />
      </PageShell>
    );
  }

  const { aba } = await searchParams;
  const tab: Tab = (TABS.find(([k]) => k === aba)?.[0] ?? "hoje") as Tab;
  const progress = stayProgress(stay, todayInBrasilia());
  const isNewcomer = progress.status === "before" || progress.day <= 7;
  const [tasks, favorites, commitments, prompts, radar, welcome, people] = await Promise.all([
    getStayTasks(stay.id),
    getFavorites(user.id),
    tab === "hoje" || tab === "agenda" ? getCommitments(user.id, tab === "agenda" ? 300 : 1) : Promise.resolve([]),
    tab === "hoje" ? getPostSessionPrompts(user.id) : Promise.resolve([]),
    tab === "hoje" ? loadRadarPlaces(stay.city_id) : Promise.resolve([]),
    tab === "hoje" && isNewcomer ? getWelcomeMeetup(stay.city_id) : Promise.resolve(null),
    tab === "pessoas" ? loadPeople(stay.city_id) : Promise.resolve([]),
  ]);

  // "Melhor local para chamadas perto dos seus favoritos": the Radar's best call-ready
  // place, preferring the neighborhoods of the user's favorites.
  const favHoods = new Set(favorites.map((f) => f.neighborhood).filter(Boolean));
  const callPlaces = radar
    .filter((r) => isCallMode(r))
    .map((r) => ({ r, score: radarScore(radarInput(r)).total, near: favHoods.has(r.neighborhood) ? 1 : 0 }))
    .sort((a, b) => b.near - a.near || b.score - a.score);
  const bestCall = callPlaces[0];
  const pending = pendingTasks(tasks);

  return (
    <PageShell title="Minha estadia">
      <section className={`${card} -mt-2 mb-5 space-y-2 p-5`} aria-label="Progresso da estadia">
        <p className="font-display text-xl font-bold">
          {progress.status === "before"
            ? `Chega em ${new Date(`${stay.arrive_on}T12:00:00`).toLocaleDateString("pt-BR")} em ${stay.city.name}`
            : progress.status === "after"
              ? `Estadia em ${stay.city.name} encerrada`
              : `Dia ${progress.day} de ${progress.total} em ${stay.city.name}`}
        </p>
        <div className="h-2.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.day} aria-label="Dias da estadia">
          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(progress.fraction * 100)}%` }} />
        </div>
        <details className="text-sm">
          <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-primary">Mudar datas ou cidade</summary>
          <div className="pt-2">
            <StaySetup cities={cities} defaultCityId={stay.city_id} routine={routine} editing />
          </div>
        </details>
      </section>

      <nav aria-label="Seções da estadia" className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4">
        {TABS.map(([k, t]) => (
          <Link
            key={k}
            href={`/estadia?aba=${k}`}
            aria-current={tab === k ? "page" : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold ${tab === k ? "bg-primary text-on-fill" : "border border-line bg-surface"}`}
          >
            {t}
          </Link>
        ))}
      </nav>

      {tab === "hoje" && (
        <div className="space-y-4">
          {prompts.map((pr) => (
            <PostSessionBanner key={pr.activity_id} prompt={pr} />
          ))}

          {welcome && (
            <Link href={`/serie/${welcome.series_id}`} className="flex items-center gap-3 rounded-2xl bg-accent-soft p-4 hover:brightness-95" data-testid="welcome">
              <BadgeCheck size={20} className="shrink-0 text-accent-strong" aria-hidden />
              <span className="text-sm">
                <span className="block font-semibold">Chegou agora? Encontro de boas-vindas {weekdayOf(welcome.starts_at)}</span>
                <span className="block text-muted">
                  {when(welcome.starts_at)}
                  {welcome.meeting_label && ` · ${welcome.meeting_label}`}
                </span>
              </span>
            </Link>
          )}

          <section className={`${card} p-5`} aria-labelledby="next-title">
            <h2 id="next-title" className="mb-2 flex items-center gap-2 font-display text-lg font-bold">
              <CalendarClock size={18} aria-hidden /> Próximo compromisso
            </h2>
            {commitments[0] ? (
              <Link href={`/atividade/${commitments[0].id}`} className="block rounded-2xl bg-surface-2 p-3 hover:brightness-95">
                <span className="block font-semibold">{commitments[0].title}</span>
                <span className="block text-sm text-muted first-letter:uppercase">
                  {when(commitments[0].starts_at)}
                  {commitments[0].meeting_label && ` · ${commitments[0].meeting_label}`}
                </span>
              </Link>
            ) : (
              <p className="text-sm text-muted">
                Nada marcado.{" "}
                <Link href={`/mapa/${stay.city.slug}?cat=activities`} className="font-semibold text-primary underline-offset-4 hover:underline">
                  Veja as rodas da cidade
                </Link>
                .
              </p>
            )}
          </section>

          <section className={`${card} p-5`} aria-labelledby="tasks-title">
            <h2 id="tasks-title" className="mb-2 font-display text-lg font-bold">
              Pendências
            </h2>
            {pending.length === 0 ? (
              <p className="text-sm text-muted">Tudo em dia.</p>
            ) : (
              <ul className="space-y-1.5 text-[15px]">
                {pending.slice(0, 3).map((t) => (
                  <li key={t.id}>• {t.title}</li>
                ))}
              </ul>
            )}
            <Link href="/estadia?aba=tarefas" className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-primary">
              Ver checklist ({tasks.filter((t) => t.done).length}/{tasks.length})
            </Link>
          </section>

          <section className={`${card} p-5`} aria-labelledby="call-title">
            <h2 id="call-title" className="mb-2 flex items-center gap-2 font-display text-lg font-bold">
              <Video size={18} aria-hidden /> Melhor lugar para chamadas
            </h2>
            {bestCall ? (
              <Link href={`/lugar/${bestCall.r.id}`} className="block rounded-2xl bg-surface-2 p-3 hover:brightness-95">
                <span className="block font-semibold">{bestCall.r.name}</span>
                <span className="block text-sm text-muted tabular-nums">
                  {bestCall.r.neighborhood}
                  {bestCall.near ? " · perto dos seus favoritos" : ""} · adequação {bestCall.score}/100
                </span>
              </Link>
            ) : (
              <p className="text-sm text-muted">Poucos dados ainda. Meça o Wi-Fi onde você trabalha e ajude o Radar.</p>
            )}
            <Link href={`/radar/${stay.city.slug}`} className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-primary">
              Abrir o Radar
            </Link>
          </section>

          <MicroSurvey origin="estadia" citySlug={stay.city.slug} />
        </div>
      )}

      {tab === "tarefas" && (
        <section className={`${card} p-5`} aria-label="Checklist da estadia">
          <TaskList tasks={tasks} citySlug={stay.city.slug} />
        </section>
      )}

      {tab === "pessoas" && (
        <section className={`${card} p-5`} aria-label="Pessoas compatíveis">
          <p className="mb-3 text-sm text-muted">Quem fica em {stay.city.name} nas mesmas semanas que você, com interesses em comum.</p>
          <PeopleList people={people} discoverable={routine.discoverable} citySlug={stay.city.slug} />
        </section>
      )}

      {tab === "agenda" && <section className={`${card} space-y-3 p-5`} aria-label="Agenda">
        <CalendarDownload events={commitments} />
        {commitments.length === 0 ? <p className="text-sm text-muted">Nada marcado. Entre numa roda para montar sua agenda.</p> : <ul className="divide-y divide-line">{commitments.map(a => <li key={a.id}><Link href={`/atividade/${a.id}`} className="block min-h-11 py-3"><span className="block font-semibold">{a.title}</span><span className="text-sm text-muted">{when(a.starts_at)} · {a.meeting_label}</span></Link></li>)}</ul>}
      </section>}

      {tab === "favoritos" && (
        <section className={`${card} p-5`} aria-label="Favoritos">
          <FavoritesList favorites={favorites} citySlug={stay.city.slug} />
        </section>
      )}

      <AppNav active="stay" citySlug={stay.city.slug} />
    </PageShell>
  );
}
