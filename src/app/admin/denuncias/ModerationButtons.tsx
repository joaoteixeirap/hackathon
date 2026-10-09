"use client";

import { useState, useTransition } from "react";
import { moderate } from "./actions";

type Props = { reportId: string; targetType: string; targetId: string; resolved: boolean; targetGone: boolean };

const btn = "min-h-11 rounded-full px-4 text-sm font-semibold disabled:opacity-50";

export function ModerationButtons({ reportId, targetType, targetId, resolved, targetGone }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (action: Parameters<typeof moderate>[1], withTarget = false) =>
    startTransition(async () => {
      const res = await moderate(reportId, action, withTarget ? targetId : undefined);
      setError(res.ok ? null : (res.message ?? "Erro"));
    });

  if (resolved) {
    return (
      <button type="button" disabled={pending} onClick={() => run("reopen")} className={`${btn} border border-line bg-surface`}>
        Reabrir
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={pending} onClick={() => run("resolve")} className={`${btn} bg-primary text-on-fill`}>
        Resolver sem ação
      </button>
      {(targetType === "message"||targetType==="community_message") && !targetGone && (
        <button type="button" disabled={pending} onClick={() => run(targetType==="community_message"?"delete_community_message":"delete_message", true)} className={`${btn} border border-danger text-danger`}>
          Apagar mensagem
        </button>
      )}
      {targetType==="community"&&!targetGone&&<button type="button" disabled={pending} onClick={()=>run("close_community",true)} className={`${btn} border border-danger text-danger`}>Fechar comunidade</button>}
      {targetType === "activity" && !targetGone && (
        <button type="button" disabled={pending} onClick={() => run("cancel_activity", true)} className={`${btn} border border-danger text-danger`}>
          Cancelar roda
        </button>
      )}
      {error && <span className="text-sm text-danger">{error}</span>}
    </div>
  );
}
