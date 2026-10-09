import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { card } from "@/components/ui/styles";
import { getMyProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ApprovalToggle } from "./ApprovalToggle";

export const metadata: Metadata = { title: "Parceiros · SoloRota" };
export const dynamic = "force-dynamic";

export default async function AdminPartnersPage() {
  const me = await getMyProfile();
  if (me?.role !== "admin") {
    return (
      <PageShell title="Parceiros">
        <p className={`${card} p-5`}>
          Área da equipe.{" "}
          <Link href="/entrar?next=/admin/parceiros" className="font-semibold text-primary underline-offset-4 hover:underline">
            Entre com a conta de admin
          </Link>
          .
        </p>
      </PageShell>
    );
  }

  const supabase = await createClient();
  const [{ data }, { data: required }] = await Promise.all([
    supabase.from("partners").select("id, business_name, document_type, document_number, approved, plan, created_at, places(count)").order("approved").order("created_at", { ascending: false }),
    supabase.rpc("require_partner_approval"),
  ]);
  const partners = (data ?? []) as unknown as {
    id: string;
    business_name: string;
    document_type: string | null;
    document_number: string | null;
    approved: boolean;
    plan: string;
    created_at: string;
    places: { count: number }[];
  }[];

  return (
    <PageShell title="Parceiros">
      {required === false && (
        <p className="-mt-3 mb-5 rounded-2xl bg-surface-2 px-3.5 py-2.5 text-sm">
          Modo hackathon: novos parceiros entram aprovados. Revogue aqui se precisar.
        </p>
      )}
      {partners.length === 0 ? (
        <p className={`${card} p-5 text-muted`}>Nenhum parceiro cadastrado.</p>
      ) : (
        <ul className={`${card} divide-y divide-line`}>
          {partners.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{p.business_name}</p>
                <p className="text-sm text-muted tabular-nums">
                  {p.document_type ? `${p.document_type.toUpperCase()} ${p.document_number ?? "sem número"}` : "Sem documento"} · {p.places[0]?.count ?? 0} lugar(es) · plano {p.plan}
                </p>
              </div>
              <ApprovalToggle partnerId={p.id} approved={p.approved} name={p.business_name} />
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
