import { describe, expect, it } from "vitest";
import { buildOverpassQuery, classify, nearestSuburb, toPlace, type OsmElement } from "./osm";

const suburbs = [
  { name: "Gonzaga", lat: -23.966, lng: -46.333 },
  { name: "Centro", lat: -23.934, lng: -46.327 },
];

describe("classify", () => {
  it("maps tags to category and subcategory", () => {
    expect(classify({ amenity: "cafe" })).toEqual({ category: "eat", subcategory: "cafe" });
    expect(classify({ office: "coworking" })).toEqual({ category: "work", subcategory: "coworking" });
    expect(classify({ healthcare: "laboratory" })).toEqual({ category: "health", subcategory: "lab" });
    expect(classify({ tourism: "viewpoint" })).toEqual({ category: "tour", subcategory: "viewpoint" });
    expect(classify({ shop: "bakery" })).toBeNull();
  });
});

describe("toPlace", () => {
  const cafe: OsmElement = {
    type: "node",
    id: 42,
    lat: -23.9655,
    lon: -46.3335,
    tags: {
      amenity: "cafe",
      name: "Café Real",
      "addr:street": "Avenida Ana Costa",
      "addr:housenumber": "100",
      internet_access: "wlan",
      opening_hours: "Mo-Fr 08:00-18:00",
      phone: "+55 13 0000-0000",
      email: "x@y.z",
      wheelchair: "limited",
    },
  };

  it("copies allowed fields and never phone or e-mail", () => {
    const place = toPlace(cafe, suburbs)!;
    expect(place).toMatchObject({
      osm_id: "node/42",
      category: "eat",
      subcategory: "cafe",
      address: "Avenida Ana Costa, 100",
      neighborhood: "Gonzaga",
      wifi_source: "osm",
      wheelchair: "limited",
      opening_hours: "Mo-Fr 08:00-18:00",
    });
    expect(JSON.stringify(place)).not.toMatch(/0000|x@y/);
  });

  it("uses the way center and skips unnamed elements", () => {
    const way: OsmElement = { type: "way", id: 7, center: { lat: -23.934, lon: -46.327 }, tags: { amenity: "pharmacy", name: "Farmácia" } };
    expect(toPlace(way, suburbs)).toMatchObject({ osm_id: "way/7", lat: -23.934, neighborhood: "Centro", wifi_source: null });
    expect(toPlace({ ...way, tags: { amenity: "pharmacy" } }, suburbs)).toBeNull();
  });
});

describe("nearestSuburb", () => {
  it("returns null when nothing is close", () => {
    expect(nearestSuburb(-23.5, -46.6, suburbs)).toBeNull();
  });
});

describe("buildOverpassQuery", () => {
  it("embeds the bbox in every clause", () => {
    const q = buildOverpassQuery("-24,-46.4,-23.91,-46.29");
    expect(q.match(/\(-24,-46\.4,-23\.91,-46\.29\)/g)?.length).toBe(7);
  });
});
