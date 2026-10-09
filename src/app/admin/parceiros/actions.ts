"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Admin approval (RLS + trigger only let admins change `approved`). */
export async function setPartnerApproved(partnerId: string, approved: boolean): Promise<{ ok: boolean }> {
  if (!/^[0-9a-f-]{36}$/i.test(partnerId)) return { ok: false };
  const supabase = await createClient();
  const { data, error } = await supabase.from("partners").update({ approved }).eq("id", partnerId).select("id");
  revalidatePath("/admin/parceiros");
  return { ok: !error && Boolean(data?.length) };
}
