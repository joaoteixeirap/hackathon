"use server";

import { getUser } from "@/lib/auth";
import { logEvent } from "@/lib/events";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { isValidAnswer } from "@/lib/survey";

/**
 * M1 micro-survey answer: anonymous on /espera (session id only), signed in on /estadia.
 * One answer per question and session (unique index); a repeat is a silent no-op.
 */
export async function answerSurvey(input: { question: string; answer: string; sid: string; origin: "espera" | "estadia"; city?: string | null }): Promise<{ ok: boolean }> {
  if (!isSupabaseConfigured() || !isValidAnswer(input.question, input.answer)) return { ok: false };
  const sid = /^[\w-]{1,64}$/.test(input.sid) ? input.sid : null;
  if (!sid) return { ok: false };
  const city = input.city && /^[a-z0-9-]{2,60}$/.test(input.city) ? input.city : null;
  const origin = input.origin === "estadia" ? "estadia" : "espera";

  const user = origin === "estadia" ? await getUser() : null;
  const db = user ? await createClient() : createPublicClient();
  const { error } = await db.from("micro_answers").insert({
    question_key: input.question,
    answer_key: input.answer,
    session_id: sid,
    city_slug: city,
    origin,
    user_id: user?.id ?? null,
  });
  if (error && error.code !== "23505") return { ok: false };
  if (!error) await logEvent("survey_answer", { sid, question_key: input.question, answer_key: input.answer, origin });
  return { ok: true };
}
