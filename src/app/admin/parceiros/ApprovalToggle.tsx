"use client";

import { useTransition } from "react";
import { setPartnerApproved } from "./actions";

export function ApprovalToggle({ partnerId, approved, name }: { partnerId: string; approved: boolean; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`${approved ? "Revogar" : "Aprovar"} ${name}`}
      onClick={() => startTransition(async () => void (await setPartnerApproved(partnerId, !approved)))}
      className={`min-h-11 rounded-full px-4 text-sm font-semibold disabled:opacity-50 ${
        approved ? "border border-line bg-surface hover:bg-surface-2" : "bg-primary text-on-fill hover:brightness-110"
      }`}
    >
      {approved ? "Revogar" : "Aprovar"}
    </button>
  );
}
