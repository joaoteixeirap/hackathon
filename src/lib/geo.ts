/** [west, south, east, north] */
export type BBox = [number, number, number, number];

const EARTH_RADIUS_M = 6_371_000;
/** Average walking speed used for "Rota do dia" estimates (≈ 4.8 km/h). */
export const WALK_SPEED_M_PER_MIN = 80;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in meters. */
export function haversine(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isInsideBBox(point: { lat: number; lng: number }, bbox: BBox): boolean {
  const [west, south, east, north] = bbox;
  return point.lng >= west && point.lng <= east && point.lat >= south && point.lat <= north;
}

/** Overpass expects `south,west,north,east`. */
export function bboxToOverpass(bbox: BBox): string {
  const [west, south, east, north] = bbox;
  return `${south},${west},${north},${east}`;
}
