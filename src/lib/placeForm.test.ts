import { describe, expect, it } from "vitest";
import type { BBox } from "./geo";
import { parsePartnerForm, parsePlaceForm } from "./placeForm";

const SANTOS: BBox = [-46.4, -24.0, -46.29, -23.91];
const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

describe("parsePlaceForm", () => {
  it("accepts a place inside the city", () => {
    const r = parsePlaceForm(form({ name: "Café da Praça", category: "eat", lat: "-23.96", lng: "-46.33", neighborhood: "Gonzaga" }), SANTOS);
    expect(r).toEqual({
      ok: true,
      data: { name: "Café da Praça", category: "eat", lat: -23.96, lng: -46.33, address: null, neighborhood: "Gonzaga", description: null },
    });
  });

  it("rejects places outside the city or without a point", () => {
    const out = parsePlaceForm(form({ name: "Longe", category: "eat", lat: "-27.6", lng: "-48.5" }), SANTOS);
    expect(!out.ok && out.errors.location).toMatch(/dentro da cidade/);
    const none = parsePlaceForm(form({ name: "X", category: "bar" }), SANTOS);
    expect(!none.ok && Object.keys(none.errors).sort()).toEqual(["category", "location", "name"]);
  });
});

describe("parsePartnerForm", () => {
  it("keeps only digits of the document and allows leaving it empty", () => {
    expect(parsePartnerForm(form({ business_name: "Café Bom", document_type: "mei", document_number: "12.345.678/0001-90" }))).toEqual({
      ok: true,
      data: { business_name: "Café Bom", document_type: "mei", document_number: "12345678000190" },
    });
    expect(parsePartnerForm(form({ business_name: "Café Bom" }))).toEqual({
      ok: true,
      data: { business_name: "Café Bom", document_type: null, document_number: null },
    });
  });

  it("rejects short names and wrong document lengths", () => {
    const r = parsePartnerForm(form({ business_name: "C", document_number: "123" }));
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(["business_name", "document_number"]);
  });
});
