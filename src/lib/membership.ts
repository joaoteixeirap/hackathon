import { costPerPerson } from "./activityForm";

export type MemberStatus = "requested" | "approved" | "declined" | "left";

export type Person = {
  user_id: string;
  display_name: string;
  verified: boolean;
  status: MemberStatus | "creator";
  requested_at: string;
  avg_rating: number | null;
  review_count: number;
};

/** How the current visitor relates to an activity; drives what the page shows. */
export type ViewerRole =
  | "creator"
  | "approved"
  | "requested"
  | "declined"
  | "unverified" // verification required and missing
  | "guest"; // may ask to join (signed in or not yet)

export function viewerRole(args: {
  userId: string | null;
  creatorId: string;
  status: MemberStatus | null;
  verified: boolean;
  verificationRequired: boolean;
}): ViewerRole {
  const { userId, creatorId, status, verified, verificationRequired } = args;
  if (userId && userId === creatorId) return "creator";
  if (status === "approved" || status === "requested" || status === "declined") return status;
  if (userId && verificationRequired && !verified) return "unverified";
  return "guest";
}

export function isParticipant(role: ViewerRole): boolean {
  return role === "creator" || role === "approved";
}

/**
 * "R$ X por pessoa" (F6). Before anyone is approved, show the split for a full group;
 * afterwards, the split among approved members plus the creator.
 */
export function costSplit(
  totalCents: number | null,
  splitCost: boolean,
  approved: number,
  capacity: number,
): { cents: number; note: string } | null {
  if (!splitCost || !totalCents) return null;
  return approved > 0
    ? { cents: costPerPerson(totalCents, approved), note: `com ${approved + 1} pessoas` }
    : { cents: costPerPerson(totalCents, capacity - 1), note: "se lotar" };
}

/** Postgres exceptions from request_join / decide_join → interface text. */
export function joinErrorMessage(raw: string | undefined): string {
  const m = raw ?? "";
  if (/verification pending/.test(m)) return "Sua verificação ainda está pendente.";
  if (/full/.test(m)) return "A roda já está lotada.";
  if (/not open/.test(m)) return "Esta roda não está mais aceitando pedidos.";
  if (/already started/.test(m)) return "Esta roda já começou.";
  if (/declined/.test(m)) return "Seu pedido para esta roda foi recusado.";
  if (/creator cannot join/.test(m)) return "Você criou esta roda.";
  if (/only the creator/.test(m)) return "Só quem criou a roda pode aprovar pedidos.";
  if (/no pending request/.test(m)) return "Este pedido já foi decidido.";
  return "Não foi possível concluir agora. Tente de novo.";
}

export const MESSAGE_MAX = 1000;

/** Trimmed chat message or null when empty / too long. */
export function cleanMessage(raw: string): string | null {
  const body = raw.trim();
  return body.length >= 1 && body.length <= MESSAGE_MAX ? body : null;
}

export const REPORT_REASONS = ["Ofensivo ou assédio", "Golpe ou spam", "Conteúdo impróprio", "Outro motivo"] as const;
