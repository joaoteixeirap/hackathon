import { describe, expect, it } from "vitest";
import { parseRoutine } from "./interests";
import { defaultLeave, parseStayForm, pendingTasks, stayProgress, type StayTask } from "./stay";
import { isValidAnswer, nextQuestion } from "./survey";

const form = (fields: Record<string, string | string[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) for (const x of [v].flat()) f.append(k, x);
  return f;
};
const CITY = "00000000-0000-4000-8000-000000000001";

describe("stayProgress", () => {
  it("counts 'Dia X de Y' inclusive of both ends", () => {
    expect(stayProgress({ arrive_on: "2026-10-01", leave_on: "2026-11-14" }, "2026-10-12")).toMatchObject({ day: 12, total: 45, status: "during" });
    expect(stayProgress({ arrive_on: "2026-10-20", leave_on: "2026-10-30" }, "2026-10-09")).toMatchObject({ day: 0, status: "before" });
    expect(stayProgress({ arrive_on: "2026-09-01", leave_on: "2026-09-10" }, "2026-10-09")).toMatchObject({ day: 10, total: 10, status: "after" });
  });
  it("defaults the leave date to 30 days later", () => {
    expect(defaultLeave("2026-10-09")).toBe("2026-11-08");
  });
});

describe("parseStayForm", () => {
  it("accepts a valid stay and rejects bad dates", () => {
    expect(parseStayForm(form({ city_id: CITY, arrive_on: "2026-10-09", leave_on: "2026-11-08", audience: "foreign" }), "2026-10-09").ok).toBe(true);
    expect(parseStayForm(form({ city_id: CITY, arrive_on: "2026-10-09", leave_on: "2026-10-01", audience: "br" }), "2026-10-09").ok).toBe(false);
    expect(parseStayForm(form({ city_id: CITY, arrive_on: "2026-01-01", leave_on: "2026-02-01", audience: "br" }), "2026-10-09").ok).toBe(false);
    expect(parseStayForm(form({ city_id: CITY, arrive_on: "2026-10-09", leave_on: "2026-11-08", audience: "x" }), "2026-10-09").ok).toBe(false);
  });
});

describe("pendingTasks", () => {
  it("orders pending tasks by phase", () => {
    const t = (id: string, phase: StayTask["phase"], done = false): StayTask => ({ id, template_id: null, title: id, area: "work", phase, due_on: null, done });
    expect(pendingTasks([t("a", "ongoing"), t("b", "before"), t("c", "first_week", true), t("d", "first_week")]).map((x) => x.id)).toEqual(["b", "d", "a"]);
  });
});

describe("parseRoutine", () => {
  it("keeps known ids, dedupes, and caps interests at 6", () => {
    const ok = parseRoutine(form({ work_rhythm: "morning", work_style: "calls", interests: ["surf", "surf", "nope", "coffee"], social_goals: ["cowork"] }));
    expect(ok).toEqual({ ok: true, data: { work_rhythm: "morning", work_style: "calls", interests: ["surf", "coffee"], social_goals: ["cowork"] } });
    expect(parseRoutine(form({ work_rhythm: "x", work_style: "calls" })).ok).toBe(false);
    const many = ["surf", "coffee", "tech", "design", "music", "art", "photo"];
    expect(parseRoutine(form({ work_rhythm: "morning", work_style: "mixed", interests: many })).ok).toBe(false);
  });
});

describe("survey", () => {
  it("validates answers and walks the questions in order", () => {
    expect(isValidAnswer("q_bet", "people")).toBe(true);
    expect(isValidAnswer("q_bet", "money")).toBe(false);
    expect(nextQuestion([])?.key).toBe("q_pain");
    expect(nextQuestion(["q_pain"])?.key).toBe("q_stay");
    expect(nextQuestion(["q_pain", "q_stay", "q_bet"])).toBeNull();
  });
});
