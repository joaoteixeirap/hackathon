import type { StyleSpecification } from "maplibre-gl";

export const STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/liberty";

let stylePromise: Promise<StyleSpecification> | null = null;

/**
 * Base style JSON, fetched once per page session (the server also preloads it, so this
 * usually resolves from the preload cache). A failed fetch is not cached.
 */
export function loadBaseStyle(): Promise<StyleSpecification> {
  stylePromise ??= fetch(STYLE_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`style ${r.status}`);
      return r.json() as Promise<StyleSpecification>;
    })
    .catch((err) => {
      stylePromise = null;
      throw err;
    });
  return stylePromise;
}
