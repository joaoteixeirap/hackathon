import { describe, expect, it } from "vitest";
import { hourLabel, nextOccurrences, seriesLabel, seriesSlot, zonedToUtc } from "./series";

describe("labels", () => {
  it("formats the weekly label", () => {
    expect(seriesLabel(4, "14:00")).toBe("Semanal · toda quinta 14h");
    expect(seriesLabel(6, "07:30")).toBe("Semanal · todo sábado 7h30");
    expect(hourLabel("09:05")).toBe("9h05");
  });
});

describe("nextOccurrences", () => {
  it("in Brasília time: weekly Thursdays at 14:00 local (17:00 UTC)", () => {
    // Friday 2026-10-09 10:00 local → next Thursday is 2026-10-15
    const from = new Date("2026-10-09T13:00:00Z");
    const occ = nextOccurrences(4, "14:00", "America/Sao_Paulo", from, 6);
    expect(occ).toHaveLength(6);
    expect(occ[0].toISOString()).toBe("2026-10-15T17:00:00.000Z");
    expect(occ[5].toISOString()).toBe("2026-11-19T17:00:00.000Z");
  });

  it("includes today when the time has not passed yet, skips it when it has", () => {
    const thursdayMorning = new Date("2026-10-15T12:00:00Z"); // 09:00 local
    expect(nextOccurrences(4, "14:00", "America/Sao_Paulo", thursdayMorning, 2)[0].toISOString()).toBe("2026-10-15T17:00:00.000Z");
    const thursdayNight = new Date("2026-10-15T23:00:00Z"); // 20:00 local
    const future = nextOccurrences(4, "14:00", "America/Sao_Paulo", thursdayNight, 2);
    expect(future).toHaveLength(2);
    expect(future[0].toISOString()).toBe("2026-10-22T17:00:00.000Z");
  });

  it("late local times fall on the next UTC day", () => {
    const occ = nextOccurrences(5, "23:30", "America/Sao_Paulo", new Date("2026-10-09T13:00:00Z"), 1);
    expect(occ[0].toISOString()).toBe("2026-10-10T02:30:00.000Z");
  });

  it("keeps the wall-clock hour across a DST change (time zones that have one)", () => {
    // New York leaves DST on 2026-11-01: 14:00 local is 18:00 UTC before, 19:00 UTC after.
    const occ = nextOccurrences(4, "14:00", "America/New_York", new Date("2026-10-26T12:00:00Z"), 2);
    expect(occ.map((d) => d.toISOString())).toEqual(["2026-10-29T18:00:00.000Z", "2026-11-05T19:00:00.000Z"]);
  });
});

describe("helpers", () => {
  it("converts local wall-clock time to UTC and finds the weekday of a date", () => {
    expect(zonedToUtc("2026-10-15", "14:00", "America/Sao_Paulo").toISOString()).toBe("2026-10-15T17:00:00.000Z");
    expect(seriesSlot("2026-10-15", "14:00")).toEqual({ weekday: 4, start_time: "14:00" });
  });
});
