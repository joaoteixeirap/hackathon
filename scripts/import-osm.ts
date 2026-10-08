/**
 * pnpm import:osm <city_slug>
 * Imports real places from OpenStreetMap (Overpass) into `places`. See SPEC.md §6.
 * Implemented in M2; the M0 placeholder only validates arguments.
 */
const slug = process.argv[2] ?? process.env.NEXT_PUBLIC_DEFAULT_CITY;

if (!slug) {
  console.error("Uso: pnpm import:osm <city_slug>");
  process.exit(1);
}

console.log(`import:osm (${slug}): importação ainda não implementada — chega no marco M2.`);
