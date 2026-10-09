import {
  Bed,
  Coffee,
  Compass,
  HeartPulse,
  Landmark,
  Laptop,
  Mountain,
  Ship,
  Users,
  Utensils,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { ActivityCategory, ChipKey } from "@/lib/places";

const PLACE_ICONS: Record<ChipKey, LucideIcon> = {
  work: Laptop,
  eat: Utensils,
  health: HeartPulse,
  stay: Bed,
  tour: Compass,
  service: Wrench,
  activities: Users,
};

const ACTIVITY_ICONS: Record<ActivityCategory, LucideIcon> = {
  meetup: Users,
  work_together: Laptop,
  food: Utensils,
  outdoor: Mountain,
  culture: Landmark,
  tour: Ship,
};

export function CategoryIcon({
  category,
  subcategory,
  size = 18,
  className,
}: {
  category: ChipKey;
  subcategory?: string | null;
  size?: number;
  className?: string;
}) {
  const Icon = category === "eat" && subcategory === "cafe" ? Coffee : PLACE_ICONS[category];
  return <Icon size={size} strokeWidth={1.75} className={className} aria-hidden />;
}

export function ActivityIcon({ category, size = 18, className }: { category: ActivityCategory; size?: number; className?: string }) {
  const Icon = ACTIVITY_ICONS[category];
  return <Icon size={size} strokeWidth={1.75} className={className} aria-hidden />;
}

/** Tailwind classes per category (kept literal so Tailwind can see them). */
export const CATEGORY_BG: Record<ChipKey, string> = {
  work: "bg-cat-work",
  eat: "bg-cat-eat",
  health: "bg-cat-health",
  stay: "bg-cat-stay",
  tour: "bg-cat-tour",
  service: "bg-cat-service",
  activities: "bg-live",
};

export const CATEGORY_TEXT: Record<ChipKey, string> = {
  work: "text-cat-work",
  eat: "text-cat-eat",
  health: "text-cat-health",
  stay: "text-cat-stay",
  tour: "text-cat-tour",
  service: "text-cat-service",
  activities: "text-accent-strong",
};
