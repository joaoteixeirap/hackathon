import { describe, expect, it } from "vitest";
import { generateOfferCode, parseOfferForm, redeemErrorMessage, todayInBrasilia } from "./offers";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};
const TODAY = "2026-10-08";

describe("parseOfferForm", () => {
  it("accepts a complete offer and upper-cases the code", () => {
    const r = parseOfferForm(form({ kind: "discount", title: "10% no café", code: "cafe10", valid_to: "2026-12-31", capacity: "50" }), TODAY);
    expect(r).toEqual({
      ok: true,
      data: { kind: "discount", title: "10% no café", description: null, code: "CAFE10", valid_from: TODAY, valid_to: "2026-12-31", capacity: 50 },
    });
  });

  it("generates a code when left empty", () => {
    const r = parseOfferForm(form({ kind: "slot", title: "Sala livre" }), TODAY);
    expect(r.ok && r.data.code).toMatch(/^[A-Z2-9]{6}$/);
  });

  it("rejects bad input field by field", () => {
    const r = parseOfferForm(form({ kind: "free", title: "x", code: "a b", valid_to: "2026-10-01", capacity: "0" }), TODAY);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["capacity", "code", "kind", "title", "valid_to"]);
  });
});

describe("generateOfferCode", () => {
  it("avoids ambiguous characters", () => {
    expect(generateOfferCode(() => 0)).toBe("AAAAAA");
    expect(generateOfferCode(() => 0.999)).toBe("999999");
  });
});

describe("redeemErrorMessage", () => {
  it("maps database errors to Portuguese", () => {
    expect(redeemErrorMessage("already redeemed today")).toMatch(/amanhã/);
    expect(redeemErrorMessage("offer sold out")).toMatch(/acabaram/);
    expect(redeemErrorMessage(undefined)).toMatch(/Tente de novo/);
  });
});

describe("todayInBrasilia", () => {
  it("uses Brasília time, not UTC", () => {
    expect(todayInBrasilia(new Date("2026-10-09T02:00:00Z"))).toBe("2026-10-08");
  });
});
