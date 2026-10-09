import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { card } from "@/components/ui/styles";
import { getMyProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ModerationButtons } from "./ModerationButtons";

export const metadata: Metadata = { title: "Denúncias · SoloRota" };
export const dynamic = "force-dynamic";

type Report = { id: string; reporter_id: string; target_type: "activity" | "message" | "profile" | "place"; target_id: string; reason: string; resolved: boolean; created_at: string };
type Target = { label: string; detail?: string; href?: string };

const TYPE_LABEL: Record<Report["target_type"], string> = { activity: "Roda", message: "Mensagem", profile: "Perfil", place: "Lugar" };

type Props = { searchParams: Promise<{ ver?: string }> };

export default async function AdminReportsPage({ searchParams }: Props) {
  const me = await getMyProfile();
  if (me?.role !== "admin") {
    return (
      <PageShell title="Denúncias">
        <p className={`${card} p-5`}>
          Área da equipe.{" "}
          <Link href="/entrar?next=/admin/denuncias" className="font-semibold text-primary underline-offset-4 hover:underline">
            Entre com a conta de admin
          </Link>
          .
        </p>
      </PageShell>
    );
  }

  const showResolved = (await searchParams).ver === "resolvidas";
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("id, reporter_id, target_type, target_id, reason, resolved, created_at")
    .eq("resolved", showResolved)
    .order("created_at", { ascending: false })
    .limit(200);
  const reports = (data ?? []) as Report[];

  // Resolve what was reported, one query per type.
  const ids = (t: Report["target_type"]) => [...new Set(reports.filter((r) => r.target_type === t).map((r) => r.target_id))];
  const [acts, msgs, profs, places] = await Promise.all([
    ids("activity").length ? supabase.from("activities").select("id, title, status").in("id", ids("activity")) : { data: [] },
    ids("message").length ? supabase.from("messages").select("id, body, activity_id, profiles(display_name)").in("id", ids("message")) : { data: [] },
    ids("profile").length ? supabase.from("profiles").select("id, display_name").in("id", ids("profile")) : { data: [] },
    ids("place").length ? supabase.from("places").select("id, name").in("id", ids("place")) : { data: [] },
  ]);
  const targets = new Map<string, Target>();
  for (const a of (acts.data ?? []) as { id: string; title: string; status: string }[]) {
    targets.set(a.id, { label: a.title, detail: a.status === "cancelled" ? "cancelada" : undefined, href: `/atividade/${a.id}` });
  }
  for (const m of (msgs.data ?? []) as unknown as { id: string; body: string; activity_id: string; profiles: { display_name: string } | null }[]) {
    targets.set(m.id, { label: `“${m.body}”`, detail: `por ${m.profiles?.display_name ?? "?"}`, href: `/atividade/${m.activity_id}` });
  }
  for (const p of (profs.data ?? []) as { id: string; display_name: string }[]) targets.set(p.id, { label: p.display_name, href: `/perfil/${p.id}` });
  for (const p of (places.data ?? []) as { id: string; name: string }[]) targets.set(p.id, { label: p.name, href: `/lugar/${p.id}` });

  const tab = (on: boolean) => `inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold ${on ? "bg-primary text-on-fill" : "border border-line bg-surface"}`;

  return (
    <PageShell title="Denúncias">
      <nav aria-label="Filtro" className="-mt-3 mb-5 flex gap-2">
        <Link href="/admin/denuncias" aria-current={!showResolved ? "page" : undefined} className={tab(!showResolved)}>
          Abertas
        </Link>
        <Link href="/admin/denuncias?ver=resolvidas" aria-current={showResolved ? "page" : undefined} className={tab(showResolved)}>
          Resolvidas
        </Link>
      </nav>

      {reports.length === 0 ? (
        <p className={`${card} p-5 text-muted`}>{showResolved ? "Nenhuma denúncia resolvida." : "Nenhuma denúncia aberta."}</p>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => {
            const t = targets.get(r.target_id);
            return (
              <li key={r.id} className={`${card} space-y-2 p-4`}>
                <p className="text-xs font-semibold text-muted">
                  {TYPE_LABEL[r.target_type]} · {new Date(r.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </p>
                <p className="font-semibold">{r.reason}</p>
                <p className="text-sm break-words">
                  {t ? (
                    <>
                      {t.href ? (
                        <Link href={t.href} className="font-semibold text-primary underline-offset-4 hover:underline">
                          {t.label}
                        </Link>
                      ) : (
                        t.label
                      )}
                      {t.detail && <span className="text-muted"> · {t.detail}</span>}
                    </>
                  ) : (
                    <span className="text-muted">Conteúdo já removido</span>
                  )}
                </p>
                <ModerationButtons reportId={r.id} targetType={r.target_type} targetId={r.target_id} resolved={r.resolved} targetGone={!t} />
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
