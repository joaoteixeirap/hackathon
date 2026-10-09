import { describe, expect, it } from "vitest";
import { parseProfileForm } from "./profile";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

describe("parseProfileForm", () => {
  it("normalizes valid input", () => {
    const res = parseProfileForm(form({ display_name: " Ana ", bio: "", home_country: "pt", languages: "PT, en en" }));
    expect(res).toEqual({ ok: true, data: { display_name: "Ana", bio: null, home_country: "PT", languages: ["pt", "en"] } });
  });

  it("rejects empty names, bad countries and bad languages", () => {
    const res = parseProfileForm(form({ display_name: "", home_country: "Brasil", languages: "portuguese" }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(Object.keys(res.errors).sort()).toEqual(["display_name", "home_country", "languages"]);
  });

  it("ignores stay and presence fields (they live in the stay and routine forms)", () => {
    const res = parseProfileForm(form({ display_name: "Ana", share_presence: "on", neighborhood: "Gonzaga" }));
    expect(res.ok && Object.keys(res.data).sort()).toEqual(["bio", "display_name", "home_country", "languages"]);
  });
});
