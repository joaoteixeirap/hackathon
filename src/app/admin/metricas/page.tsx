import type { SupabaseClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import QRCode from "qrcode";
import { PageShell } from "@/components/ui/PageShell";
import { card } from "@/components/ui/styles";
import { AUDIENCE_LABELS, BLOCK_LABELS, BLOCKS, funnel, percent, type EventRow, type SignupRow } from "@/lib/analytics";
import { getMyProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Métricas · SoloRota" };
export const dynamic = "force-dynamic";

const PERIODS = { "7": 7, "14": 14, "30": 30, todos: null } as const;
type PeriodKey = keyof typeof PERIODS;
const PAGE = 1000;
const MAX_ROWS = 50_000;
const ESPERA_EVENTS = ["view_espera", ...BLOCKS.map((b) => `click_block_${b}`)];
const APP_EVENTS = [
  ["view_map", "Visitas ao mapa"],
  ["open_place", "Fichas de lugar abertas"],
  ["create_activity", "Rodas criadas"],
  ["request_join", "Pedidos para entrar"],
] as const;
// Targets suggested by the team in EVIDENCE.md §2 (not market benchmarks).
const TARGET_SIGNUPS = 100;
const TARGET_BLOCK_CONVERSION = 0.1;

/** PostgREST caps responses at 1000 rows: read in pages. */
async function readAll<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data } = await query(from, from + PAGE - 1);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

async function load(supabase: SupabaseClient, since: string | null) {
  const events = readAll<EventRow>((a, b) => {
    let q = supabase.from("events").select("name, props").in("name", ESPERA_EVENTS);
    if (since) q = q.gte("created_at", since);
    return q.order("created_at").range(a, b);
  });
  const signups = readAll<SignupRow>((a, b) => {
    let q = supabase.from("waitlist").select("origin_block, utm_source, utm_campaign, audience");
    if (since) q = q.gte("created_at", since);
    return q.order("created_at").range(a, b);
  });
  const appCounts = Promise.all(
    APP_EVENTS.map(async ([name]) => {
      let q = supabase.from("events").select("id", { count: "exact", head: true }).eq("name", name);
      if (since) q = q.gte("created_at", since);
      return (await q).count ?? 0;
    }),
  );
  const partners = supabase.from("partners").select("id", { count: "exact", head: true });
  const offers = supabase.from("offers").select("id", { count: "exact", head: true });
  const [e, s, c, p, o] = await Promise.all([events, signups, appCounts, partners, offers]);
  return { events: e, signups: s, appCounts: c, partners: p.count ?? 0, offers: o.count ?? 0 };
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-3">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="font-display text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

type Props = { searchParams: Promise<{ dias?: string }> };

export default async function MetricsPage({ searchParams }: Props) {
  const me = await getMyProfile();
  if (me?.role !== "admin") {
    return (
      <PageShell title="Métricas">
        <p className={`${card} p-5`}>
          Área da equipe.{" "}
          <Link href="/entrar?next=/admin/metricas" className="font-semibold text-primary underline-offset-4 hover:underline">
            Entre com a conta de admin
          </Link>
          .
        </p>
      </PageShell>
    );
  }

  const dias = (await searchParams).dias;
  const period: PeriodKey = dias && dias in PERIODS ? (dias as PeriodKey) : "30";
  const days = PERIODS[period];
  const since = days ? new Date(Date.now() - days * 86_400_000).toISOString() : null;

  const supabase = await createClient();
  const data = await load(supabase, since);
  const f = funnel(data.events, data.signups);

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const qrUrl = `${origin}/espera?utm_source=qr&utm_campaign=pitch`;
  const qrSvg = await QRCode.toString(qrUrl, { type: "svg", margin: 1, color: { dark: "#0f1f2a", light: "#ffffff" } });
  const bestBlock = Math.max(0, ...f.blocks.map((b) => b.ofVisitors ?? 0));

  return (
    <PageShell title="Evidência de demanda">
      <nav aria-label="Período" className="-mt-3 mb-5 flex flex-wrap gap-2">
        {(Object.keys(PERIODS) as PeriodKey[]).map((k) => (
          <Link
            key={k}
            href={`/admin/metricas?dias=${k}`}
            aria-current={k === period ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold ${k === period ? "bg-primary text-on-fill" : "border border-line bg-surface"}`}
          >
            {k === "todos" ? "Tudo" : `${k} dias`}
          </Link>
        ))}
      </nav>

      <section className={`${card} p-5`} aria-labelledby="espera-title">
        <h2 id="espera-title" className="mb-3 font-display text-xl font-bold">
          Lista de espera
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Visitantes" value={f.visitors} />
          <Stat label="Cadastros" value={f.signups} hint={`meta ${TARGET_SIGNUPS} em 14 dias`} />
          <Stat label="Conversão" value={percent(f.conversion)} />
        </div>
        <p className="mt-3 text-sm">
          Melhor bloco: <span className="font-semibold tabular-nums">{percent(bestBlock || null)}</span> dos visitantes ·{" "}
          {bestBlock >= TARGET_BLOCK_CONVERSION ? (
            <span className="font-semibold text-success">meta de 10% atingida</span>
          ) : (
            <span className="text-muted">meta sugerida: 10%</span>
          )}
        </p>
      </section>

      <section className={`${card} mt-6 p-5`} aria-labelledby="blocks-title">
        <h2 id="blocks-title" className="mb-1 font-display text-xl font-bold">
          Conversão por bloco
        </h2>
        <p className="mb-3 text-sm text-muted">Qual proposta de valor puxa mais cadastros (porta falsa).</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="py-2 pr-2 font-semibold">Bloco</th>
                <th className="py-2 pr-2 text-right font-semibold">Cliques</th>
                <th className="py-2 pr-2 text-right font-semibold">Cadastros</th>
                <th className="py-2 pr-2 text-right font-semibold">÷ visitantes</th>
                <th className="py-2 text-right font-semibold">÷ cliques</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {f.blocks.map((b) => (
                <tr key={b.block}>
                  <th scope="row" className="py-2.5 pr-2 text-left font-semibold">
                    {BLOCK_LABELS[b.block]}
                  </th>
                  <td className="py-2.5 pr-2 text-right">{b.clickers}</td>
                  <td className="py-2.5 pr-2 text-right">{b.signups}</td>
                  <td className="py-2.5 pr-2 text-right font-semibold">{percent(b.ofVisitors)}</td>
                  <td className="py-2.5 text-right">{percent(b.ofClickers)}</td>
                </tr>
              ))}
              {f.noBlock > 0 && (
                <tr>
                  <th scope="row" className="py-2.5 pr-2 text-left font-normal text-muted">
                    Sem bloco escolhido
                  </th>
                  <td className="py-2.5 pr-2 text-right text-muted">—</td>
                  <td className="py-2.5 pr-2 text-right">{f.noBlock}</td>
                  <td colSpan={2} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`${card} mt-6 p-5`} aria-labelledby="sources-title">
        <h2 id="sources-title" className="mb-3 font-display text-xl font-bold">
          Cadastros por origem
        </h2>
        {f.sources.length === 0 ? (
          <p className="text-sm text-muted">Sem visitas no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className="py-2 pr-2 font-semibold">utm_source · campanha</th>
                  <th className="py-2 pr-2 text-right font-semibold">Visitantes</th>
                  <th className="py-2 pr-2 text-right font-semibold">Cadastros</th>
                  <th className="py-2 text-right font-semibold">Conversão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {f.sources.map((s) => (
                  <tr key={`${s.source}-${s.campaign}`}>
                    <th scope="row" className="py-2.5 pr-2 text-left font-semibold">
                      {s.source}
                      {s.campaign && <span className="font-normal text-muted"> · {s.campaign}</span>}
                    </th>
                    <td className="py-2.5 pr-2 text-right">{s.visitors}</td>
                    <td className="py-2.5 pr-2 text-right">{s.signups}</td>
                    <td className="py-2.5 text-right font-semibold">{percent(s.conversion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <h3 className="mt-5 mb-2 text-sm font-semibold">Por perfil</h3>
        <ul className="grid grid-cols-3 gap-2">
          {f.audiences.map((a) => (
            <li key={a.audience}>
              <Stat label={AUDIENCE_LABELS[a.audience]} value={a.signups} />
            </li>
          ))}
        </ul>
      </section>

      <section className={`${card} mt-6 p-5`} aria-labelledby="app-title">
        <h2 id="app-title" className="mb-3 font-display text-xl font-bold">
          Uso do app
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {APP_EVENTS.map(([name, label], i) => (
            <Stat key={name} label={label} value={data.appCounts[i]} />
          ))}
          <Stat label="Parceiros cadastrados" value={data.partners} hint="meta: 5 com oferta" />
          <Stat label="Ofertas publicadas" value={data.offers} />
        </div>
      </section>

      <section className={`${card} mt-6 space-y-3 p-5 text-center`} aria-labelledby="qr-title">
        <h2 id="qr-title" className="font-display text-xl font-bold">
          QR para o pitch
        </h2>
        <div role="img" aria-label="QR code da lista de espera" className="mx-auto size-56 rounded-2xl bg-white p-2" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        <p className="text-sm break-all text-muted">{qrUrl}</p>
        <p className="text-xs text-muted">Cadastros por este QR aparecem como origem “qr · pitch”.</p>
      </section>
    </PageShell>
  );
}
