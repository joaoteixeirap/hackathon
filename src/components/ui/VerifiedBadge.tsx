import { BadgeCheck, Clock } from "lucide-react";

/** "Verificado", or "Verificação pendente" when the verification gate is on (require_verification()). */
export function VerifiedBadge({ verified, required = false }: { verified: boolean; required?: boolean }) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
        <BadgeCheck size={14} strokeWidth={2} aria-hidden /> Verificado
      </span>
    );
  }
  if (!required) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">
      <Clock size={14} strokeWidth={2} aria-hidden /> Verificação pendente
    </span>
  );
}
