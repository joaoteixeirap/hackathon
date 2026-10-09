import { describe, expect, it } from "vitest";
import { parseProfileForm } from "./profile";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

describe("parseProfileForm", () => {
  it("normalizes valid input", () => {
    const res = parseProfileForm(
      form({ display_name: "  Ana ", home_country: "pt", languages: "PT, en en", bio: "" }),
    );
    expect(res).toEqual({
      ok: true,
      data: expect.objectContaining({
        display_name: "Ana",
        home_country: "PT",
        languages: ["pt", "en"],
        bio: null,
        share_presence: false,
      }),
    });
  });

  it("rejects empty names and reversed stay dates", () => {
    const res = parseProfileForm(
      form({ display_name: "", stay_from: "2026-10-10", stay_to: "2026-10-01" }),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.display_name).toBeDefined();
      expect(res.errors.stay_to).toBeDefined();
    }
  });

  it("requires city and neighborhood to share presence", () => {
    const res = parseProfileForm(form({ display_name: "Ana", share_presence: "on" }));
    expect(res.ok).toBe(false);
  });
});
