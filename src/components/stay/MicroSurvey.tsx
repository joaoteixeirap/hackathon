"use client";

import { useEffect, useState, useTransition } from "react";
import { answerSurvey } from "@/app/actions/survey";
import { nextQuestion, type SurveyQuestion } from "@/lib/survey";
import { visitorId } from "@/lib/track";

const KEY = "sr_survey_done";

function readDone(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** M1: one question at a time, one tap, always skippable; one answer per question and device. */
export function MicroSurvey({ origin, citySlug }: { origin: "espera" | "estadia"; citySlug?: string | null }) {
  const [done, setDone] = useState<string[] | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => setDone(readDone()), []);
  if (done == null) return null;
  const q: SurveyQuestion | null = nextQuestion(done);
  if (!q) return null;

  const mark = (key: string) => {
    const next = [...done, key];
    setDone(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // private mode: the survey just shows again next time
    }
  };

  return (
    <section aria-labelledby="survey-q" className="space-y-3 rounded-3xl border border-line bg-surface p-4 shadow-soft-sm">
      <p className="text-xs font-semibold text-muted">Pergunta rápida · {done.length + 1} de 3</p>
      <h2 id="survey-q" className="font-display text-lg leading-snug font-bold">
        {q.title}
      </h2>
      <div className="grid gap-2">
        {q.options.map((o) => (
          <button
            key={o.key}
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await answerSurvey({ question: q.key, answer: o.key, sid: visitorId(), origin, city: citySlug ?? null });
                mark(q.key);
              })
            }
            className="min-h-11 rounded-2xl border border-line bg-surface px-4 py-2.5 text-left text-sm font-semibold hover:bg-surface-2 disabled:opacity-60"
          >
            {o.label}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => mark(q.key)} className="min-h-11 text-sm font-semibold text-muted">
        Pular
      </button>
    </section>
  );
}
