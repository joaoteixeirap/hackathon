"use client";

import { Flag } from "lucide-react";
import { useState, useTransition } from "react";
import { report } from "@/app/atividade/[id]/actions";
import { REPORT_REASONS } from "@/lib/membership";

/** "Denunciar" (F5/F14): pick a reason, the report goes to the admin queue. */
export function ReportButton({ targetType, targetId, label = "Denunciar" }: { targetType: "message" | "activity" | "profile"; targetId: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (sent) return <span role="status" className="text-xs font-semibold text-success">Denúncia enviada</span>;

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center gap-1 px-1 text-xs font-semibold text-muted hover:text-danger">
        <Flag size={12} aria-hidden /> {label}
      </button>
    );
  }

  return (
    <div role="group" aria-label="Motivo da denúncia" className="flex flex-wrap items-center gap-1.5 py-1">
      {REPORT_REASONS.map((r) => (
        <button
          key={r}
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await report(targetType, targetId, r);
              if (res.ok) setSent(true);
              else setError(res.message);
            })
          }
          className="min-h-11 rounded-full border border-line bg-surface px-3 text-xs font-semibold hover:bg-surface-2 disabled:opacity-50"
        >
          {r}
        </button>
      ))}
      <button type="button" onClick={() => setOpen(false)} className="min-h-11 px-2 text-xs font-semibold text-muted">
        Cancelar
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
