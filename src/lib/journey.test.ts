import { describe, expect, it } from "vitest";
import { groupBenefitState, suggestedSession } from "./journey";
describe("session journey", () => {
  it("suggests the next weekday at 14h or the partner idle slot", () => {
    const now = new Date("2026-10-09T19:00:00Z");
    expect(suggestedSession([], "America/Sao_Paulo", now)).toEqual({ date: "2026-10-12", time: "14:00" });
    expect(suggestedSession([{ id: "x", weekday: 6, start_time: "10:30", end_time: "12:30", seats: 6, note: null, created_at: now.toISOString() }], "America/Sao_Paulo", now)).toEqual({ date: "2026-10-10", time: "10:30" });
  });
  it("requires group size and the 30-minute window including its boundaries", () => {
    const start = "2026-10-09T17:00:00Z", end = "2026-10-09T20:00:00Z";
    const at = Date.parse(start) - 30 * 60_000;
    expect(groupBenefitState(3,4,start,end,at).missing).toBe(1);
    expect(groupBenefitState(3,4,start,end,at).available).toBe(false);
    expect(groupBenefitState(4,4,start,end,at).available).toBe(true);
    expect(groupBenefitState(4,4,start,end,at-1).available).toBe(false);
    expect(groupBenefitState(4,4,start,end,Date.parse(end)+1).available).toBe(false);
  });
});
