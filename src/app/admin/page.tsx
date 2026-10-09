import { BadgeCheck, ChartColumn, ChevronRight, Flag, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { card } from "@/components/ui/styles";
import { getMyProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Equipe · SoloRota" };
export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const me = await getMyProfile();
  if (me?.role !== "admin") {
    return (
      <PageShell title="Equipe">
        <p className={`${card} p-5`}>
          Área da equipe.{" "}
          <Link href="/entrar?next=/admin" className="font-semibold text-primary underline-offset-4 hover:underline">
            Entre com a conta de admin
          </Link>
          .
        </p>
      </PageShell>
    );
  }

  const supabase = await createClient();
  const [reports, verifications, pendingPartners] = await Promise.all([
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("resolved", false),
    supabase.from("verification_requests").select("user_id", { count: "exact", head: true }),
    supabase.from("partners").select("id", { count: "exact", head: true }).eq("approved", false),
  ]);

  const items = [
    { href: "/admin/metricas", icon: <ChartColumn size={20} aria-hidden />, title: "Métricas", note: "Lista de espera, conversão por bloco, QR do pitch" },
    { href: "/admin/denuncias", icon: <Flag size={20} aria-hidden />, title: "Denúncias", note: `${reports.count ?? 0} aberta(s)` },
    { href: "/admin/verificacoes", icon: <BadgeCheck size={20} aria-hidden />, title: "Verificações", note: `${verifications.count ?? 0} pendente(s)` },
    { href: "/admin/parceiros", icon: <Store size={20} aria-hidden />, title: "Parceiros", note: `${pendingPartners.count ?? 0} aguardando aprovação` },
  ];

  return (
    <PageShell title="Equipe">
      <ul className={`${card} divide-y divide-line`}>
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-surface-2">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">{i.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{i.title}</span>
                <span className="block text-sm text-muted">{i.note}</span>
              </span>
              <ChevronRight size={18} className="text-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
