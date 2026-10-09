-- OSM accessibility tag copied by `pnpm import:osm` (SPEC.md §6).
alter table places add column wheelchair text check (wheelchair in ('yes','no','limited'));
