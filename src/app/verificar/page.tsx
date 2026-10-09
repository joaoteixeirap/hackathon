import { BadgeCheck, Clock, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { card } from "@/components/ui/styles";
import { getUser } from "@/lib/auth";
import { getVerificationState, VERIFICATION_MAX_BYTES } from "@/lib/verification";
import { VerificationForm } from "./VerificationForm";

export const metadata: Metadata = { title: "Verificar perfil · SoloRota" };
export const dynamic = "force-dynamic";

export default async function VerifyPage() {
  const user = await getUser();
  if (!user) {
    return (
      <PageShell title="Verificar perfil">
        <p className={`${card} p-5`}>Não conseguimos abrir sua sessão agora. Recarregue a página em instantes.</p>
      </PageShell>
    );
  }
  const state = await getVerificationState(user.id);

  return (
    <PageShell title="Verificar perfil">
      {state.verified ? (
        <p className={`${card} flex items-center gap-3 p-5 font-semibold`}>
          <BadgeCheck className="text-primary" aria-hidden /> Seu perfil já é verificado.
        </p>
      ) : state.pending ? (
        <div className={`${card} space-y-2 p-5`}>
          <p className="flex items-center gap-2 font-semibold">
            <Clock size={18} className="text-muted" aria-hidden /> Recebemos sua foto. Ela está em análise.
          </p>
          <p className="text-sm text-muted">A equipe responde em até um dia. A foto é apagada assim que a decisão sai.</p>
        </div>
      ) : (
        <div className={`${card} space-y-4 p-5`}>
          {!state.required && (
            <p className="rounded-2xl bg-surface-2 px-3.5 py-2.5 text-sm">Durante o hackathon a verificação é opcional: você já pode entrar em rodas.</p>
          )}
          <p className="flex items-start gap-2 text-sm">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-success" aria-hidden />
            Rodas são encontros reais. O selo &quot;Verificado&quot; mostra a quem organiza que você é quem diz ser.
          </p>
          <VerificationForm userId={user.id} maxBytes={VERIFICATION_MAX_BYTES} />
        </div>
      )}
      <p className="mt-6 text-center text-sm">
        <Link href="/perfil" className="font-semibold text-primary underline-offset-4 hover:underline">
          Voltar ao perfil
        </Link>
      </p>
    </PageShell>
  );
}
