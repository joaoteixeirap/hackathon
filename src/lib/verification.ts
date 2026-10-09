import "server-only";
import { createClient } from "./supabase/server";

export const VERIFICATION_BUCKET = "verifications";
export const VERIFICATION_MAX_BYTES = 5 * 1024 * 1024;
export const VERIFICATION_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

/** Whether the F4/F7 gate is on (require_verification() in SQL; off in hackathon mode). */
export async function verificationRequired(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("require_verification");
  return data !== false;
}

export type VerificationState = { required: boolean; verified: boolean; pending: boolean };

export async function getVerificationState(userId: string): Promise<VerificationState> {
  const supabase = await createClient();
  const [required, me, req] = await Promise.all([
    verificationRequired(),
    supabase.from("profiles").select("verified").eq("id", userId).maybeSingle(),
    supabase.from("verification_requests").select("user_id").eq("user_id", userId).maybeSingle(),
  ]);
  return { required, verified: me.data?.verified ?? false, pending: Boolean(req.data) };
}
