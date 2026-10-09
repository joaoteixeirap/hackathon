import { BadgeCheck } from "lucide-react";

export function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
      <BadgeCheck size={14} strokeWidth={2} aria-hidden /> Verificado
    </span>
  ) : null; // Verification is off in hackathon mode; "Verificação pendente" returns with M5.
}
