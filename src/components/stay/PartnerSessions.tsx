import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { card } from "@/components/ui/styles";
type Stats = { upcoming: { id: string; title: string; starts_at: string; capacity: number; people: number; benefit: string | null }[]; sessions: number; people: number; redemptions: number };
export async function PartnerSessions({ placeId }: { placeId: string }) {
  const { data, error } = await (await createClient()).rpc("partner_sessions", { p_place_id: placeId });
  const s = data as Stats | null;
  return <section className={`${card} mt-6 space-y-3 p-5`} aria-label="Sessões no seu local"><h2 className="font-display text-xl font-bold">Sessões no seu local</h2>{error || !s ? <p className="text-sm text-muted">Não foi possível carregar as sessões agora.</p> : <><p className="text-sm tabular-nums">Últimos 30 dias: {s.sessions} sessões · {s.people} participações aprovadas · {s.redemptions} resgates de grupo</p>{s.upcoming.length ? <ul className="divide-y divide-line">{s.upcoming.map(a => <li key={a.id} className="py-3"><Link href={`/atividade/${a.id}`} className="inline-flex min-h-11 items-center font-semibold text-primary">{a.title}</Link><p className="text-sm text-muted">{new Date(a.starts_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · {a.people}/{a.capacity} pessoas{a.benefit ? ` · ${a.benefit}` : ""}</p></li>)}</ul> : <p className="text-sm text-muted">Nenhuma sessão marcada ainda.</p>}</>}</section>;
}
