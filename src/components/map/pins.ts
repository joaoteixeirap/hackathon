// Map pin artwork ("gota-bússola", DESIGN.md §5) rendered from SVG into MapLibre images.
import { Bed, Coffee, Compass, HeartPulse, Laptop, Utensils, Wifi, Wrench, type IconNode } from "lucide";
import type { Map as MlMap } from "maplibre-gl";
import type { PlaceCategory } from "@/lib/places";
import type { MapTheme } from "./applyTheme";

export const CATEGORY_HEX: Record<MapTheme, Record<PlaceCategory, string>> = {
  day: {
    work: "#1E5B66",
    eat: "#E8603C",
    health: "#2E8B6A",
    stay: "#4B5BA6",
    tour: "#8A4F7D",
    service: "#5B6770",
  },
  // ~10% lighter for the night chart (DESIGN.md §2).
  night: {
    work: "#2B7C8A",
    eat: "#EE7D5E",
    health: "#3BA882",
    stay: "#6877BF",
    tour: "#A66A98",
    service: "#7A8790",
  },
};

const INK: Record<MapTheme, string> = { day: "#1F2A30", night: "#EDE5D2" };
const PAPER: Record<MapTheme, string> = { day: "#FBF6EA", night: "#16282F" };

/** Icon variants: the category icon, plus a coffee cup for cafés. */
const ICONS: Record<string, IconNode> = {
  work: Laptop,
  eat: Utensils,
  "eat-cafe": Coffee,
  health: HeartPulse,
  stay: Bed,
  tour: Compass,
  service: Wrench,
};

export function pinIconKey(category: PlaceCategory, subcategory: string | null, seal: boolean): string {
  const variant = category === "eat" && subcategory === "cafe" ? "eat-cafe" : category;
  return `pin-${variant}${seal ? "-seal" : ""}`;
}

function iconSvg(node: IconNode, color: string, strokeWidth = 2.25): string {
  const children = node
    .map(([tag, attrs]) => {
      const a = Object.entries(attrs)
        .map(([k, v]) => `${k}="${v}"`)
        .join(" ");
      return `<${tag} ${a}/>`;
    })
    .join("");
  return `<g fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${children}</g>`;
}

/** 40×44 viewBox: drop centered at x=20, tip at y=42; seal stamp top-right. */
export function pinSvg(variant: string, seal: boolean, theme: MapTheme): string {
  const category = variant.split("-")[0] as PlaceCategory;
  const fill = CATEGORY_HEX[theme][category];
  const ink = INK[theme];
  const icon = iconSvg(ICONS[variant], "#FFFFFF");
  const stamp = seal
    ? `<circle cx="32.5" cy="7.5" r="6.75" fill="${PAPER[theme]}" stroke="${ink}" stroke-width="1" stroke-dasharray="2 1.4"/>` +
      `<g transform="translate(28.5 3.5) scale(0.3333)">${iconSvg(Wifi, ink, 3)}</g>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="88" viewBox="0 0 40 44">
<path d="M20 42 C20 42 7 28 7 17 A13 13 0 1 1 33 17 C33 28 20 42 20 42 Z" fill="${fill}" stroke="${ink}" stroke-width="1.5" stroke-linejoin="round"/>
<circle cx="20" cy="17" r="9.5" fill="none" stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="1"/>
<g transform="translate(12.5 9.5) scale(0.625)">${icon}</g>
${stamp}
</svg>`;
}

/** Engraved horizontal hatching used on water (old chart look). */
function hatchSvg(theme: MapTheme): string {
  const color = theme === "day" ? "#1E5B66" : "#9CC9C3";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
<path d="M0 4.5 H16 M0 12.5 H7 M10 12.5 H16" stroke="${color}" stroke-opacity="${theme === "day" ? 0.18 : 0.22}" stroke-width="0.8"/>
</svg>`;
}

function loadSvg(svg: string, width: number, height: number): Promise<HTMLImageElement> {
  const img = new Image(width, height);
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return img.decode().then(() => img);
}

/** Registers every pin variant (and the water hatch) for the given theme. */
export async function addPinImages(map: MlMap, theme: MapTheme): Promise<void> {
  const jobs: Promise<void>[] = [];
  for (const variant of Object.keys(ICONS)) {
    for (const seal of [false, true]) {
      const id = `pin-${variant}${seal ? "-seal" : ""}`;
      jobs.push(
        loadSvg(pinSvg(variant, seal, theme), 80, 88).then((img) => {
          if (map.hasImage(id)) map.removeImage(id);
          map.addImage(id, img, { pixelRatio: 2 });
        }),
      );
    }
  }
  jobs.push(
    loadSvg(hatchSvg(theme), 16, 16).then((img) => {
      if (map.hasImage("carta-hatch")) map.removeImage("carta-hatch");
      map.addImage("carta-hatch", img, { pixelRatio: 1 });
    }),
  );
  await Promise.all(jobs);
}
