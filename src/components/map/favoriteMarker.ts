// "Meus favoritos" layer (SPEC_V2 E3): a small star over each saved place.
export type FavoriteSpot = { id: string; name: string; lat: number; lng: number };

export function createFavoriteMarker(f: FavoriteSpot): HTMLElement {
  const el = document.createElement("div");
  el.className = "fav-star";
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", `Favorito: ${f.name}`);
  el.textContent = "★";
  return el;
}
