// Place markers rendered from SVG into MapLibre images (DESIGN.md §5).
import { Bed, Coffee, Compass, HeartPulse, Laptop, Utensils, Wifi, Wrench, type IconNode } from "lucide";
import type { Map as MlMap } from "maplibre-gl";
import type { PlaceCategory } from "@/lib/places";
import type { MapTheme } from "./applyTheme";

export const CATEGORY_HEX: Record<MapTheme, Record<PlaceCategory, string>> = {
  day: {
    work: "#0F7A83",
    eat: "#D9661A",
    health: "#D6335C",
    stay: "#6A3FD1",
    tour: "#1677C7",
    service: "#56636D",
  },
  night: {
    work: "#2AA3AD",
    eat: "#F08A3E",
    health: "#EE5C80",
    stay: "#8E6CF0",
    tour: "#3F9BE6",
    service: "#7F8D97",
  },
};

const RIM: Record<MapTheme, string> = { day: "#FFFFFF", night: "#162027" };
const BADGE: Record<MapTheme, string> = { day: "#0B3B4A", night: "#6CC3D1" };

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

/**
 * 40×46 viewBox: soft shadow, a white-rimmed circle with a short tail (tip at y=43),
 * category icon in white, and an optional "Selo" badge at the top-right.
 */
export function pinSvg(variant: string, seal: boolean, theme: MapTheme): string {
  const category = variant.split("-")[0] as PlaceCategory;
  const fill = CATEGORY_HEX[theme][category];
  const rim = RIM[theme];
  const badge = seal
    ? `<circle cx="32" cy="8" r="7" fill="${BADGE[theme]}" stroke="${rim}" stroke-width="2"/>` +
      `<g transform="translate(28 4) scale(0.3333)">${iconSvg(Wifi, theme === "day" ? "#FFFFFF" : "#0D1418", 3.2)}</g>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="92" viewBox="0 0 40 46">
<defs><filter id="s" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.6" flood-color="#0F1F2A" flood-opacity="0.28"/></filter></defs>
<g filter="url(#s)">
<path d="M20 43 L15.2 34.6 A15 15 0 1 1 24.8 34.6 Z" fill="${rim}"/>
<circle cx="20" cy="21" r="12.5" fill="${fill}"/>
</g>
<g transform="translate(13 14) scale(0.5833)">${iconSvg(ICONS[variant], "#FFFFFF")}</g>
${badge}
</svg>`;
}

function loadSvg(svg: string, width: number, height: number): Promise<HTMLImageElement> {
  const img = new Image(width, height);
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return img.decode().then(() => img);
}

/** Registers every pin variant for the given theme. */
export async function addPinImages(map: MlMap, theme: MapTheme): Promise<void> {
  const jobs: Promise<void>[] = [];
  for (const variant of Object.keys(ICONS)) {
    for (const seal of [false, true]) {
      const id = `pin-${variant}${seal ? "-seal" : ""}`;
      jobs.push(
        loadSvg(pinSvg(variant, seal, theme), 80, 92).then((img) => {
          if (map.hasImage(id)) map.removeImage(id);
          map.addImage(id, img, { pixelRatio: 2 });
        }),
      );
    }
  }
  await Promise.all(jobs);
}
