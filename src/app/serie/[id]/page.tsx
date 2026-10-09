import { BadgeCheck, CalendarClock, MapPin, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityIcon } from "@/components/ui/CategoryIcon";
import { DemoTag } from "@/components/ui/DemoTag";
import { PageShell } from "@/components/ui/PageShell";
import { card } from "@/components/ui/styles";
import { getUser } from "@/lib/auth";
import { ACTIVITY_LABELS, stripDemo, type ActivityCategory } from "@/lib/places";
import { seriesLabel } from "@/lib/series";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { ShareActions } from "../../atividade/[id]/ShareActions";
import { FollowPanel, SeriesQueue } from "./SeriesControls";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ nova?: string }> };
type Series = {
  id: string;
  title: string;
  description: string | null;
  category: ActivityCategory;
  weekday: number;
  start_time: string;
  meeting_label: string | null;
  capacity: number;
  is_official: boolean;
  is_demo: boolean;
  creator_id: string;
  cities: { name: string; slug: string };
};

const TZ = "America/Sao_Paulo";

async function loadSeries(id: string): Promise<Series | null> {
  if (!isSupabaseConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("activity_series")
    .select("id, title, description, category, weekday, start_time, meeting_label, capacity, is_official, is_demo, creator_id, cities(name, slug)")
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as Series) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await loadSeries((await params).id);
  if (!s) return { title: "Série · SoloRota" };
  const title = `${stripDemo(s.title)} · ${s.cities.name}`;
  const description = `${seriesLabel(s.weekday, s.start_time.slice(0, 5))}${s.meeting_label ? ` · ${s.meeting_label}` : ""}. Encontro recorrente no SoloRota.`;
  return { title, description, openGraph: { title, description, type: "website", locale: "pt_BR", siteName: "SoloRota" } };
}

/** SPEC_V2 S3: a weekly series, its next dates and who follows it. */
export default async function SeriesPage({ params, searchParams }: Props) {
  const [{ id }, { nova }] = await Promise.all([params, searchParams]);
  const s = await loadSeries(id);
  if (!s) notFound();

  const supabase = await createClient();
  await supabase.rpc("refresh_series", { p_series_id: id }); // materialize on open (no cron needed)
  const user = await getUser();
  const [{ data: occ }, mine, { data: people }] = await Promise.all([
    supabase
      .from("activities")
      .select("id, starts_at, capacity, status")
      .eq("series_id", id)
      .gt("starts_at", new Date().toISOString())
      .neq("status", "cancelled")
      .order("starts_at")
      .limit(6),
    user ? supabase.from("series_members").select("status").eq("series_id", id).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    user ? supabase.rpc("series_people", { p_series_id: id }) : Promise.resolve({ data: [] }),
  ]);
  const counts = await Promise.all((occ ?? []).map((o) => supabase.rpc("approved_count", { p_activity_id: o.id })));
  const status = user?.id === s.creator_id ? "creator" : ((mine.data as { status: string } | null)?.status ?? null);
  const list = (people ?? []) as { user_id: string; display_name: string; status: string }[];
  const label = seriesLabel(s.weekday, s.start_time.slice(0, 5));
  const title = stripDemo(s.title);

  return (
    <PageShell title={title}>
      {nova && (
        <div role="status" className="-mt-2 mb-5 rounded-3xl bg-primary p-5 text-on-fill shadow-soft-md">
          <p className="font-display text-lg font-bold">Série criada!</p>
          <p className="text-sm">As próximas 6 datas já estão no mapa. Mande o link para o pessoal seguir.</p>
        </div>
      )}

      <article className={`${card} space-y-4 p-5`}>
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-muted">
          <span className="grid size-8 place-items-center rounded-xl bg-live text-[#0f1f2a]">
            <ActivityIcon category={s.category} size={16} />
          </span>
          {ACTIVITY_LABELS[s.category]} · {s.cities.name}
          {s.is_official && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">
              <BadgeCheck size={13} aria-hidden /> Oficial
            </span>
          )}
          {s.is_demo && <DemoTag />}
        </p>
        <p className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-bold" data-testid="series-label">
          <CalendarClock size={16} aria-hidden /> {label}
        </p>
        <p className="flex items-start gap-2">
          <MapPin size={18} className="mt-0.5 shrink-0" aria-hidden /> {s.meeting_label ?? "Ponto marcado no mapa"}
        </p>
        <p className="flex items-center gap-2 text-sm">
          <Users size={18} aria-hidden /> Até {s.capacity} pessoas por encontro
        </p>
        {s.description && <p className="whitespace-pre-line">{s.description}</p>}
        <p className="rounded-2xl bg-surface-2 px-3.5 py-2.5 text-sm">Combine em local público.</p>
        <FollowPanel seriesId={s.id} status={status as never} />
      </article>

      <section className={`${card} mt-6 p-5`} aria-labelledby="dates-title">
        <h2 id="dates-title" className="mb-2 font-display text-xl font-bold">
          Próximas datas
        </h2>
        {(occ ?? []).length === 0 ? (
          <p className="text-sm text-muted">Nenhuma data futura.</p>
        ) : (
          <ul className="divide-y divide-line">
            {(occ ?? []).map((o, i) => {
              const approved = Number(counts[i]?.data ?? 0);
              return (
                <li key={o.id}>
                  <Link href={`/atividade/${o.id}`} className="flex min-h-14 items-center justify-between gap-3 py-2 hover:bg-surface-2">
                    <span className="font-semibold first-letter:uppercase">
                      {new Date(o.starts_at).toLocaleString("pt-BR", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ })}
                    </span>
                    <span className="text-sm text-muted tabular-nums">
                      {o.status === "full" ? "lotada" : `${approved + 1}/${o.capacity}`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {status === "creator" && (
        <section className={`${card} mt-6 p-5`} aria-labelledby="sq-title">
          <h2 id="sq-title" className="mb-2 font-display text-xl font-bold">
            Pedidos para seguir
          </h2>
          <SeriesQueue seriesId={s.id} requests={list.filter((p) => p.status === "requested")} />
        </section>
      )}

      {(status === "creator" || status === "approved") && (
        <section className={`${card} mt-6 p-5`} aria-labelledby="sm-title">
          <h2 id="sm-title" className="mb-2 font-display text-xl font-bold">
            Quem segue
          </h2>
          {list.filter((p) => p.status === "approved").length === 0 ? (
            <p className="text-sm text-muted">Ninguém ainda.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {list
                .filter((p) => p.status === "approved")
                .map((p) => (
                  <li key={p.user_id} className="rounded-full bg-surface-2 px-3 py-1.5 text-sm font-semibold">
                    {p.display_name}
                  </li>
                ))}
            </ul>
          )}
        </section>
      )}

      <section className="mt-6 space-y-3" aria-labelledby="share-title">
        <h2 id="share-title" className="font-display text-xl font-bold">
          Chamar gente
        </h2>
        <ShareActions path={`/serie/${s.id}`} title={title} whenText={label} />
      </section>
    </PageShell>
  );
}
