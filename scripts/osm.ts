// Pure OSM → places mapping (SPEC.md §6). Kept free of I/O so it can be unit-tested.

export type OsmElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export type PlaceCategory = "work" | "eat" | "health" | "stay" | "tour" | "service";

export type OsmPlace = {
  osm_id: string;
  name: string;
  category: PlaceCategory;
  subcategory: string;
  lat: number;
  lng: number;
  address: string | null;
  neighborhood: string | null;
  opening_hours: string | null;
  wheelchair: "yes" | "no" | "limited" | null;
  wifi_source: "osm" | null;
};

type Rule = { key: string; values: string[]; category: PlaceCategory; sub?: (v: string) => string };

// Order matters: the first matching rule wins.
const RULES: Rule[] = [
  { key: "amenity", values: ["coworking_space"], category: "work", sub: () => "coworking" },
  { key: "office", values: ["coworking"], category: "work", sub: () => "coworking" },
  { key: "amenity", values: ["library"], category: "work" },
  { key: "amenity", values: ["cafe", "restaurant", "fast_food", "bar"], category: "eat" },
  { key: "amenity", values: ["clinic", "doctors", "hospital", "pharmacy", "dentist"], category: "health" },
  { key: "healthcare", values: ["laboratory"], category: "health", sub: () => "lab" },
  { key: "tourism", values: ["hostel", "guest_house", "apartment", "hotel"], category: "stay" },
  { key: "tourism", values: ["attraction", "viewpoint", "museum"], category: "tour" },
  { key: "leisure", values: ["beach_resort"], category: "tour" },
  { key: "shop", values: ["laundry", "dry_cleaning"], category: "service", sub: () => "laundry" },
  { key: "shop", values: ["supermarket"], category: "service" },
  { key: "shop", values: ["mobile_phone"], category: "service", sub: () => "mobile" },
  { key: "amenity", values: ["bicycle_rental", "post_office"], category: "service" },
];

export function buildOverpassQuery(bbox: string): string {
  return `[out:json][timeout:90];
(
  nwr["amenity"~"^(cafe|restaurant|fast_food|bar|coworking_space|library|clinic|doctors|hospital|pharmacy|dentist|bicycle_rental|post_office)$"](${bbox});
  nwr["office"="coworking"](${bbox});
  nwr["tourism"~"^(hostel|guest_house|apartment|hotel|attraction|viewpoint|museum)$"](${bbox});
  nwr["leisure"="beach_resort"](${bbox});
  nwr["healthcare"="laboratory"](${bbox});
  nwr["shop"~"^(laundry|dry_cleaning|supermarket|mobile_phone)$"](${bbox});
  node["place"~"^(suburb|neighbourhood|quarter)$"](${bbox});
);
out center tags;`;
}

const WIFI_VALUES = new Set(["wlan", "yes", "wifi", "free"]);

export function classify(tags: Record<string, string>): { category: PlaceCategory; subcategory: string } | null {
  for (const rule of RULES) {
    const v = tags[rule.key];
    if (v && rule.values.includes(v)) {
      return { category: rule.category, subcategory: rule.sub ? rule.sub(v) : v };
    }
  }
  return null;
}

function coords(el: OsmElement): { lat: number; lng: number } | null {
  if (el.lat != null && el.lon != null) return { lat: el.lat, lng: el.lon };
  if (el.center) return { lat: el.center.lat, lng: el.center.lon };
  return null;
}

export type Suburb = { name: string; lat: number; lng: number };

export function extractSuburbs(elements: OsmElement[]): Suburb[] {
  return elements
    .filter((e) => e.type === "node" && e.tags?.place && e.tags.name && e.lat != null && e.lon != null)
    .map((e) => ({ name: e.tags!.name, lat: e.lat!, lng: e.lon! }));
}

/** Closest suburb label within maxMeters (cheap equirectangular distance). */
export function nearestSuburb(lat: number, lng: number, suburbs: Suburb[], maxMeters = 2500): string | null {
  const kx = 111_320 * Math.cos((lat * Math.PI) / 180);
  let best: Suburb | null = null;
  let bestD = Infinity;
  for (const s of suburbs) {
    const d = Math.hypot((s.lng - lng) * kx, (s.lat - lat) * 110_540);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best && bestD <= maxMeters ? best.name : null;
}

/** Maps one OSM element to a place, or null when it is unnamed or out of scope. Phone/e-mail are never copied. */
export function toPlace(el: OsmElement, suburbs: Suburb[]): OsmPlace | null {
  const tags = el.tags ?? {};
  const name = tags.name?.trim();
  if (!name) return null;
  const kind = classify(tags);
  if (!kind) return null;
  const pos = coords(el);
  if (!pos) return null;

  const street = tags["addr:street"];
  const number = tags["addr:housenumber"];
  const address = street ? (number ? `${street}, ${number}` : street) : null;
  const wheelchair = tags.wheelchair;

  return {
    osm_id: `${el.type}/${el.id}`,
    name: name.slice(0, 120),
    ...kind,
    ...pos,
    address,
    neighborhood: tags["addr:suburb"] ?? nearestSuburb(pos.lat, pos.lng, suburbs),
    opening_hours: tags.opening_hours ?? null,
    wheelchair: wheelchair === "yes" || wheelchair === "no" || wheelchair === "limited" ? wheelchair : null,
    wifi_source: WIFI_VALUES.has(tags.internet_access ?? "") ? "osm" : null,
  };
}
