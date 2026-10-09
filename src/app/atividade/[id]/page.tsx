import { CalendarClock, MapPin, Navigation, Users, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityIcon } from "@/components/ui/CategoryIcon";
import { DemoTag } from "@/components/ui/DemoTag";
import { PageShell } from "@/components/ui/PageShell";
import { buttonPrimary, card } from "@/components/ui/styles";
import { costPerPerson, formatBRL } from "@/lib/activityForm";
import { loadActivity } from "@/lib/mapData";
import { ACTIVITY_LABELS, stripDemo } from "@/lib/places";
import { directionsUrl } from "@/lib/share";
import { ShareActions } from "./ShareActions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ nova?: string }> };

const TZ = "America/Sao_Paulo";

function whenText(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const day = start.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
  const t = (d: Date) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  return `${day}, ${t(start)}–${t(new Date(endsAt))}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await loadActivity((await params).id);
  if (!a) return { title: "Atividade · SoloRota" };
  const title = `${stripDemo(a.title)} · ${a.city.name}`;
  const description = `${whenText(a.starts_at, a.ends_at)}${a.meeting_label ? ` · ${a.meeting_label}` : ""}. Roda de nômades no SoloRota.`;
  return { title, description, openGraph: { title, description, type: "website", locale: "pt_BR", siteName: "SoloRota" } };
}

export default async function ActivityPage({ params, searchParams }: Props) {
  const [{ id }, { nova }] = await Promise.all([params, searchParams]);
  const a = await loadActivity(id);
  if (!a) notFound();

  const title = stripDemo(a.title);
  const when = whenText(a.starts_at, a.ends_at);
  const spots = Math.max(0, a.capacity - 1 - a.approved);
  // With nobody approved yet, show the split for a full group instead of the whole bill.
  const perPerson =
    a.split_cost && a.cost_total_cents
      ? a.approved > 0
        ? { cents: costPerPerson(a.cost_total_cents, a.approved), note: `com ${a.approved + 1} pessoas` }
        : { cents: costPerPerson(a.cost_total_cents, a.capacity - 1), note: "se lotar" }
      : null;
  const past = new Date(a.ends_at).getTime() < Date.now();

  return (
    <PageShell title={title}>
      {nova && (
        <div role="status" className="-mt-2 mb-5 rounded-3xl bg-accent p-5 text-white shadow-soft-md">
          <p className="font-display text-lg font-bold">Roda criada!</p>
          <p className="text-sm">Ela já aparece no mapa. Mande o link no grupo do WhatsApp para chamar o pessoal.</p>
        </div>
      )}

      <article className={`${card} space-y-5 p-5`}>
        <p className="flex items-center gap-2 text-sm font-semibold text-muted">
          <span className="grid size-8 place-items-center rounded-xl bg-live text-white">
            <ActivityIcon category={a.category} size={16} />
          </span>
          Roda · {ACTIVITY_LABELS[a.category]} · {a.city.name}
          {a.is_demo && <DemoTag />}
        </p>

        {a.status === "cancelled" && <p className="font-bold text-danger">Esta atividade foi cancelada.</p>}
        {past && a.status !== "cancelled" && <p className="font-bold text-muted">Esta atividade já aconteceu.</p>}

        <dl className="grid grid-cols-[auto_1fr] items-start gap-x-3 gap-y-3">
          <dt className="pt-0.5">
            <CalendarClock size={18} strokeWidth={1.75} aria-label="Quando" />
          </dt>
          <dd className="first-letter:uppercase">{when}</dd>
          <dt className="pt-0.5">
            <MapPin size={18} strokeWidth={1.75} aria-label="Ponto de encontro" />
          </dt>
          <dd>
            {a.meeting_label ?? "Ponto marcado no mapa"}
            {a.place && (
              <Link href={`/lugar/${a.place.id}`} className="ml-2 text-sm font-bold text-primary underline-offset-4 hover:underline">
                ver lugar
              </Link>
            )}
          </dd>
          <dt className="pt-0.5">
            <Users size={18} strokeWidth={1.75} aria-label="Vagas" />
          </dt>
          <dd className="tabular-nums">
            {a.status === "full" || spots === 0 ? "lotada" : `${spots} ${spots === 1 ? "vaga" : "vagas"} de ${a.capacity - 1}`}
          </dd>
          {a.cost_total_cents ? (
            <>
              <dt className="pt-0.5">
                <Wallet size={18} strokeWidth={1.75} aria-label="Custo" />
              </dt>
              <dd className="tabular-nums">
                {formatBRL(a.cost_total_cents)} no total
                {perPerson != null && (
                  <span className="mt-1 block text-lg font-medium">
                    {formatBRL(perPerson.cents)} por pessoa <span className="text-sm text-muted">{perPerson.note}</span>
                  </span>
                )}
              </dd>
            </>
          ) : null}
        </dl>

        {a.description && <p className="whitespace-pre-line">{a.description}</p>}

        <p className="rounded-2xl bg-surface-2 px-3.5 py-2.5 text-sm">Combine em local público.</p>

        <div className="flex flex-wrap gap-2">
          <a href={directionsUrl(a.lat, a.lng)} target="_blank" rel="noopener noreferrer" className={`${buttonPrimary} gap-2`}>
            <Navigation size={16} strokeWidth={1.75} aria-hidden /> Como chegar
          </a>
          <Link href={`/mapa/${a.city.slug}?atividade=${a.id}`} className="inline-flex min-h-11 items-center px-2 text-sm font-bold text-primary underline-offset-4 hover:underline">
            Ver no mapa
          </Link>
        </div>
      </article>

      <section className="mt-6 space-y-3" aria-labelledby="share-title">
        <h2 id="share-title" className="font-display text-xl font-bold">
          Chamar gente
        </h2>
        <ShareActions path={`/atividade/${a.id}`} title={title} whenText={when} />
      </section>
    </PageShell>
  );
}
