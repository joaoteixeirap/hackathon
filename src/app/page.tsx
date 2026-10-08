import { redirect } from "next/navigation";
import { defaultCitySlug } from "@/lib/cities";

export default function Home() {
  redirect(`/mapa/${defaultCitySlug}`);
}
