"use client";

import { BadgeCheck, Clock, Hand, LogOut } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { leaveActivity, requestJoin, type ActionResult } from "@/app/atividade/[id]/actions";
import { buttonPrimary, buttonSecondary } from "@/components/ui/styles";
import type { ViewerRole } from "@/lib/membership";
import { visitorId } from "@/lib/track";

type Props = {
  activityId: string;
  role: ViewerRole;
  /** open | full | cancelled | done */
  status: string;
  started: boolean;
};

/** The visitor's own state for a roda (F4): ask, wait, in the group, or declined. */
export function JoinPanel({ activityId, role, status, started }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<ActionResult>) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.message);
    });

  if (role === "creator") return null;
  const closed = status === "cancelled" || status === "done" || started;

  let body: React.ReactNode = null;
  if (role === "approved") {
    body = (
      <>
        <p className="flex items-center gap-2 font-semibold text-success">
          <BadgeCheck size={18} aria-hidden /> Você está no grupo.
        </p>
        {!closed && (
          <button type="button" disabled={pending} onClick={() => run(() => leaveActivity(activityId))} className={`${buttonSecondary} min-h-11 gap-2 px-5`}>
            <LogOut size={16} aria-hidden /> Sair da roda
          </button>
        )}
      </>
    );
  } else if (role === "requested") {
    body = (
      <>
        <p className="flex items-start gap-2">
          <Clock size={18} className="mt-0.5 shrink-0 text-muted" aria-hidden />
          <span>
            <span className="font-semibold">Pedido enviado.</span> Quem organiza vai aprovar ou recusar. Esta página atualiza sozinha.
          </span>
        </p>
        {!closed && (
          <button type="button" disabled={pending} onClick={() => run(() => leaveActivity(activityId))} className={`${buttonSecondary} min-h-11 px-5`}>
            Cancelar pedido
          </button>
        )}
      </>
    );
  } else if (role === "declined") {
    body = <p className="text-muted">Seu pedido não foi aceito desta vez. Que tal outra roda no mapa?</p>;
  } else if (closed) {
    return null;
  } else if (role === "unverified") {
    body = (
      <>
        <p>
          <span className="font-semibold">Verificação pendente.</span> Para entrar em rodas, envie uma selfie com documento. A equipe confere e apaga a foto em seguida.
        </p>
        <Link href="/verificar" className={`${buttonPrimary} min-h-11 px-5`}>
          Verificar meu perfil
        </Link>
      </>
    );
  } else if (status === "full") {
    body = <p className="font-semibold text-muted">Roda lotada.</p>;
  } else {
    body = (
      <>
        <p className="text-sm text-muted">Quem organiza vê seu nome, se você é verificado e sua nota antes de aprovar.</p>
        <button type="button" disabled={pending} onClick={() => run(() => requestJoin(activityId, visitorId()))} className={`${buttonPrimary} gap-2`}>
          <Hand size={18} aria-hidden /> {pending ? "Enviando…" : "Pedir para entrar"}
        </button>
      </>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl bg-surface-2 p-4">
      {body}
      <p role="status" className="text-sm text-danger empty:hidden">
        {error}
      </p>
    </div>
  );
}
