// "Quem está aqui" (F8): a soft blob at the neighborhood centroid with the head count.
// Never an individual position; the database only returns neighborhoods with 3+ people.

export type PresenceSpot = { neighborhood: string; people: number; lat: number; lng: number };

export function createPresenceMarker(p: PresenceSpot): HTMLElement {
  const root = document.createElement("div");
  root.className = "presence";
  root.setAttribute("role", "img");
  root.setAttribute("aria-label", `${p.neighborhood}: ${p.people} nômades na cidade`);
  // Bigger blob for more people, within a modest range.
  const size = Math.round(Math.min(120, 56 + p.people * 6));
  root.style.setProperty("--presence-size", `${size}px`);

  const count = document.createElement("span");
  count.className = "presence__count";
  count.textContent = String(p.people);
  const label = document.createElement("span");
  label.className = "presence__label";
  label.textContent = p.neighborhood;
  root.append(count, label);
  return root;
}
