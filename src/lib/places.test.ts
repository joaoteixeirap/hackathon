import { describe, expect, it } from "vitest";
import { EMPTY_FILTERS, filterPlaces, normalize, type PlaceSummary } from "./places";

const base: PlaceSummary = {
  id: "1",
  name: "Café Real",
  category: "eat",
  subcategory: "cafe",
  lat: -23.96,
  lng: -46.33,
  neighborhood: "Gonzaga",
  address: null,
  opening_hours: null,
  wifi_mbps: null,
  wifi_source: null,
  has_power_outlets: null,
  quiet_level: null,
  price_hint: null,
  accepts_without_plan: null,
  languages: null,
  wheelchair: null,
  seal_valid_until: null,
  call_ready_valid_until: null,
  last_verified_at: null,
  wifi_fact: null,
  featured: false,
  offers: 0,
  is_demo: false,
};

const places: PlaceSummary[] = [
  base,
  { ...base, id: "2", name: "Cowork Demo", category: "work", wifi_mbps: 90, seal_valid_until: "2999-01-01T00:00:00Z", offers: 2 },
  { ...base, id: "3", name: "Farmácia Ponta", category: "health", neighborhood: "Ponta da Praia", wifi_mbps: 10 },
];

const ids = (list: PlaceSummary[]) => list.map((p) => p.id);

describe("filterPlaces", () => {
  it("returns everything with no filters", () => {
    expect(ids(filterPlaces(places, EMPTY_FILTERS))).toEqual(["1", "2", "3"]);
  });

  it("filters by category chip", () => {
    expect(ids(filterPlaces(places, { ...EMPTY_FILTERS, category: "work" }))).toEqual(["2"]);
  });

  it("searches name and neighborhood ignoring accents and case", () => {
    expect(ids(filterPlaces(places, { ...EMPTY_FILTERS, query: "cafe" }))).toEqual(["1"]);
    expect(ids(filterPlaces(places, { ...EMPTY_FILTERS, query: "PONTA" }))).toEqual(["3"]);
  });

  it("applies Wi-Fi forte (>= 25 Mbps), offer and seal toggles", () => {
    expect(ids(filterPlaces(places, { ...EMPTY_FILTERS, wifiStrong: true }))).toEqual(["2"]);
    expect(ids(filterPlaces(places, { ...EMPTY_FILTERS, hasOffer: true }))).toEqual(["2"]);
    expect(ids(filterPlaces(places, { ...EMPTY_FILTERS, seal: true }))).toEqual(["2"]);
  });

  it("'Aberto agora' keeps only places known to be open", () => {
    const isOpen = (p: PlaceSummary) => (p.id === "1" ? true : p.id === "2" ? false : null);
    expect(ids(filterPlaces(places, { ...EMPTY_FILTERS, openNow: true }, isOpen))).toEqual(["1"]);
  });
});

describe("normalize", () => {
  it("strips diacritics", () => {
    expect(normalize("  São Vicente ")).toBe("sao vicente");
  });
});
