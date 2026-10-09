import { describe, expect, it } from "vitest";
import { costPerPerson, parseActivityForm, parseBRL } from "./activityForm";
import type { BBox } from "./geo";

const bbox: BBox = [-46.4, -24.0, -46.29, -23.91];
const now = new Date("2026-10-08T12:00:00-03:00");

const form = (over: Record<string, string> = {}) => {
  const f = new FormData();
  const base = {
    title: "Dia de trabalho conjunto",
    category: "work_together",
    date: "2026-10-09",
    time: "09:00",
    duration: "4",
    lat: "-23.9655",
    lng: "-46.3338",
    capacity: "6",
    ...over,
  };
  for (const [k, v] of Object.entries(base)) f.set(k, v);
  return f;
};

describe("parseActivityForm", () => {
  it("builds ISO times in Brasília time", () => {
    const res = parseActivityForm(form(), { bbox, now });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.starts_at).toBe("2026-10-09T12:00:00.000Z");
      expect(res.data.ends_at).toBe("2026-10-09T16:00:00.000Z");
      expect(res.data.split_cost).toBe(false);
    }
  });

  it("rejects past times, out-of-city points and invalid capacity", () => {
    const res = parseActivityForm(form({ date: "2026-10-08", time: "11:00", lat: "-23.55", lng: "-46.63", capacity: "40" }), { bbox, now });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.time).toBeDefined();
      expect(res.errors.location).toMatch(/dentro da cidade/);
      expect(res.errors.capacity).toBeDefined();
    }
  });

  it("requires a meeting point", () => {
    const res = parseActivityForm(form({ lat: "", lng: "" }), { bbox, now });
    expect(!res.ok && res.errors.location).toMatch(/Toque no mapa/);
  });

  it("parses cost and split only when there is a cost", () => {
    const res = parseActivityForm(form({ cost: "1.200,50", split_cost: "on" }), { bbox, now });
    expect(res.ok && res.data).toMatchObject({ cost_total_cents: 120050, split_cost: true });
    const free = parseActivityForm(form({ split_cost: "on" }), { bbox, now });
    expect(free.ok && free.data.split_cost).toBe(false);
  });
});

describe("money helpers", () => {
  it("parses BRL formats", () => {
    expect(parseBRL("120")).toBe(12000);
    expect(parseBRL("R$ 99,9")).toBe(9990);
    expect(parseBRL("abc")).toBeNaN();
  });

  it("splits among approved members plus the creator, rounding up", () => {
    expect(costPerPerson(24000, 3)).toBe(6000);
    expect(costPerPerson(10000, 2)).toBe(3334);
  });
});
