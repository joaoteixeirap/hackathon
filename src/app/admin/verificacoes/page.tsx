import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { card } from "@/components/ui/styles";
import { getMyProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { VERIFICATION_BUCKET } from "@/lib/verification";
import { DecisionButtons } from "./DecisionButtons";

export const metadata: Metadata = { title: "Verificações · SoloRota" };
export const dynamic = "force-dynamic";

const SIGNED_URL_SECONDS = 600;

export default async function AdminVerificationsPage() {
  const me = await getMyProfile();
  if (me?.role !== "admin") {
    return (
      <PageShell title="Verificações">
        <p className={`${card} p-5`}>
          Área da equipe.{" "}
          <Link href="/entrar?next=/admin/verificacoes" className="font-semibold text-primary underline-offset-4 hover:underline">
            Entre com a conta de admin
          </Link>
          .
        </p>
      </PageShell>
    );
  }

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("verification_requests")
    .select("user_id, file_path, created_at, profiles(display_name, home_country)")
    .order("created_at");
  const requests = (rows ?? []) as unknown as {
    user_id: string;
    file_path: string;
    created_at: string;
    profiles: { display_name: string; home_country: string | null } | null;
  }[];
  const { data: signed } = requests.length
    ? await supabase.storage.from(VERIFICATION_BUCKET).createSignedUrls(requests.map((r) => r.file_path), SIGNED_URL_SECONDS)
    : { data: [] };
  const urlFor = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return (
    <PageShell title="Verificações">
      <p className="-mt-3 mb-5 text-sm text-muted">
        Confira se o rosto confere com o documento. A foto é apagada assim que você decide.
      </p>
      {requests.length === 0 ? (
        <p className={`${card} p-5 text-muted`}>Nenhum pedido pendente.</p>
      ) : (
        <ul className="space-y-4">
          {requests.map((r) => {
            const name = r.profiles?.display_name ?? "Sem nome";
            const url = urlFor.get(r.file_path);
            return (
              <li key={r.user_id} className={`${card} space-y-3 p-5`}>
                <p className="font-display text-lg font-bold">
                  <Link href={`/perfil/${r.user_id}`} className="underline-offset-4 hover:underline">
                    {name}
                  </Link>
                  <span className="ml-2 text-sm font-normal text-muted">
                    {r.profiles?.home_country ?? ""} · enviado em {new Date(r.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                  </span>
                </p>
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from a private bucket
                  <img src={url} alt={`Selfie com documento de ${name}`} className="max-h-96 w-full rounded-2xl bg-surface-2 object-contain" />
                ) : (
                  <p className="text-sm text-danger">Arquivo não encontrado.</p>
                )}
                <DecisionButtons userId={r.user_id} name={name} />
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
