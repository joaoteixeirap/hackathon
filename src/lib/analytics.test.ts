import { describe, expect, it } from "vitest";
import { cleanUtm, funnel, percent, sanitizeEvent } from "./analytics";

describe("sanitizeEvent", () => {
  it("accepts known events and keeps short flat string props", () => {
    expect(sanitizeEvent("click_block_work", { sid: "abc", block: "work", n: 3 })).toEqual({
      name: "click_block_work",
      props: { sid: "abc", block: "work", n: "3" },
    });
  });
  it("drops unknown events, nested values, odd keys and long strings", () => {
    expect(sanitizeEvent("delete_everything", {})).toBeNull();
    expect(sanitizeEvent("view_map", { nested: { a: 1 }, "Bad-Key": "x", sid: "s".repeat(200) })).toEqual({
      name: "view_map",
      props: { sid: "s".repeat(80) },
    });
    expect(sanitizeEvent("view_map", "nope")).toEqual({ name: "view_map", props: {} });
  });
});

describe("cleanUtm", () => {
  it("normalizes and rejects unsafe values", () => {
    expect(cleanUtm(" Instagram ")).toBe("instagram");
    expect(cleanUtm(["qr", "x"])).toBe("qr");
    expect(cleanUtm("<script>")).toBeNull();
    expect(cleanUtm(undefined)).toBeNull();
  });
});

describe("funnel", () => {
  const view = (sid: string, utm_source?: string) => ({ name: "view_espera", props: { sid, ...(utm_source ? { utm_source } : {}) } });
  const click = (sid: string, block: string) => ({ name: `click_block_${block}`, props: { sid, block } });
  const signup = (origin_block: string | null, utm_source: string | null = null, audience = "nomad_br") => ({ origin_block, utm_source, utm_campaign: null, audience });

  it("counts distinct visitors and clickers, and conversion per block", () => {
    const events = [
      view("a", "instagram"), view("a", "instagram"), view("b"), view("c"), view("d", "instagram"),
      click("a", "bonds"), click("a", "bonds"), click("b", "bonds"), click("c", "work"),
      { name: "view_map", props: { sid: "z" } },
      { name: "view_espera", props: null },
    ];
    const f = funnel(events, [signup("bonds", "instagram"), signup("work"), signup(null, null, "partner")]);

    expect(f.visitors).toBe(4);
    expect(f.signups).toBe(3);
    expect(f.conversion).toBe(0.75);
    expect(f.blocks.find((b) => b.block === "bonds")).toEqual({ block: "bonds", clickers: 2, signups: 1, ofVisitors: 0.25, ofClickers: 0.5 });
    expect(f.blocks.find((b) => b.block === "week")).toMatchObject({ clickers: 0, signups: 0, ofClickers: null });
    expect(f.noBlock).toBe(1);
    expect(f.sources[0].source).toBe("direto"); // most signups first
    expect(f.sources.find((s) => s.source === "instagram")).toEqual({ source: "instagram", campaign: null, visitors: 2, signups: 1, conversion: 0.5 });
    expect(f.sources.find((s) => s.source === "direto")).toMatchObject({ visitors: 2, signups: 2 });
    expect(f.audiences).toContainEqual({ audience: "partner", signups: 1 });
  });

  it("handles an empty period", () => {
    const f = funnel([], []);
    expect(f.conversion).toBeNull();
    expect(percent(f.conversion)).toBe("—");
    expect(percent(0.125)).toBe("12,5%");
  });
});
