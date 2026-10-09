import { describe, expect, it } from "vitest";
import { addDays, localDay, shiftDemoActivities } from "./demo";

const at = (iso: string) => ({ id: iso, starts_at: iso, ends_at: new Date(Date.parse(iso) + 2 * 3_600_000).toISOString() });

describe("shiftDemoActivities", () => {
  // Seeded on 2026-10-08 (BRT): first roda 2026-10-09 09:00 BRT = 12:00Z.
  const seeded = [at("2026-10-09T12:00:00.000Z"), at("2026-10-10T20:30:00.000Z"), at("2026-10-14T17:00:00.000Z")];

  it("moves the earliest roda to tomorrow, keeping hours and spacing", () => {
    const { shiftDays, rows } = shiftDemoActivities(seeded, new Date("2026-10-20T15:00:00Z"));
    expect(shiftDays).toBe(12);
    expect(rows[0].starts_at).toBe("2026-10-21T12:00:00.000Z"); // still 09:00 in Santos
    expect(rows[1].starts_at).toBe("2026-10-22T20:30:00.000Z");
    expect(Date.parse(rows[2].ends_at) - Date.parse(rows[2].starts_at)).toBe(2 * 3_600_000);
  });

  it("is a no-op when the earliest roda is already tomorrow", () => {
    expect(shiftDemoActivities(seeded, new Date("2026-10-08T15:00:00Z")).shiftDays).toBe(0);
  });

  it("uses Brasília days, not UTC, near midnight", () => {
    // 23:30 BRT on Oct 20 is already Oct 21 in UTC; tomorrow is still Oct 21 locally.
    expect(shiftDemoActivities(seeded, new Date("2026-10-21T02:30:00Z")).rows[0].starts_at).toBe("2026-10-21T12:00:00.000Z");
  });

  it("handles no rows", () => {
    expect(shiftDemoActivities([])).toEqual({ shiftDays: 0, rows: [] });
  });
});

describe("day helpers", () => {
  it("formats local days and adds days", () => {
    expect(localDay(new Date("2026-10-09T02:00:00Z"))).toBe("2026-10-08");
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  });
});
