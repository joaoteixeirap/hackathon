import "server-only";
import type { BBox } from "./geo";
import { isSupabaseConfigured } from "./supabase/env";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "./supabase/public";
import catalogue from "@/data/sp-cities.json";

export type City = {
  id: string | null;
  slug: string;
  name: string;
  state: string;
  center_lat: number;
  center_lng: number;
  zoom: number;
  bbox: BBox;
  ibge_code?:string|null;
};

/**
 * Bootstrap values mirroring supabase/seed.sql, used only while the database
 * is not configured (M0) or unreachable. The `cities` table is the source of truth.
 */
const BOOTSTRAP_CITIES: City[] = [
  {
    id: null,
    slug: "santos",
    name: "Santos",
    state: "SP",
    center_lat: -23.964,
    center_lng: -46.329,
    zoom: 13.2,
    bbox: [-46.4, -24.0, -46.29, -23.91],
  },
];

/** Cities change rarely: cached on the server for an hour. */
export async function getCity(slug: string): Promise<City | null> {
  if (isSupabaseConfigured()) {
    try {
      return await cachedCity(slug);
    } catch {
      // fall through to bootstrap values
    }
  }
  return BOOTSTRAP_CITIES.find((c) => c.slug === slug) ?? (catalogue.cities.find(c=>c.slug===slug) ? {...catalogue.cities.find(c=>c.slug===slug)!,id:null,bbox:catalogue.cities.find(c=>c.slug===slug)!.bbox as BBox} : null);
}

const cachedCity = unstable_cache(fetchCity, ["city-v1"], { revalidate: 3600, tags: ["cities"] });

async function fetchCity(slug: string): Promise<City | null> {
  const { data, error } = await createPublicClient()
    .from("cities")
    .select("id, slug, name, state, center_lat, center_lng, zoom, bbox,ibge_code")
    .eq("slug", slug)
    .maybeSingle();
  // Throwing (instead of returning bootstrap values) keeps failures out of the cache.
  if (error) throw error;
  return data ? { ...data, zoom: Number(data.zoom), bbox: data.bbox as BBox } : (catalogue.cities.find(c=>c.slug===slug) ? {...catalogue.cities.find(c=>c.slug===slug)!,id:null,bbox:catalogue.cities.find(c=>c.slug===slug)!.bbox as BBox} : null);
}

export const defaultCitySlug = process.env.NEXT_PUBLIC_DEFAULT_CITY || "santos";

export async function listMapCities():Promise<City[]> {
 if(isSupabaseConfigured())try{return await cachedMapCities();}catch{/* offline catalogue */}
 return catalogue.cities.map(c=>({...c,id:null,bbox:c.bbox as BBox}));
}
const cachedMapCities=unstable_cache(async()=>{
 const {data,error}=await createPublicClient().from("cities").select("id,slug,name,state,center_lat,center_lng,zoom,bbox,ibge_code").order("name").limit(1000);
 if(error)throw error;
 return (data??[]).map(c=>({...c,zoom:Number(c.zoom),bbox:c.bbox as BBox}));
},["map-cities-sp-v2"],{revalidate:3600,tags:["cities"]});

/** All cities (name order) for pickers such as /espera. */
export async function listCities(): Promise<Pick<City, "slug" | "name">[]> {
  if (isSupabaseConfigured()) {
    try {
      return await cachedCityList();
    } catch {
      // fall through to bootstrap values
    }
  }
  return BOOTSTRAP_CITIES.map(({ slug, name }) => ({ slug, name }));
}

const cachedCityList = unstable_cache(
  async () => {
    const { data, error } = await createPublicClient().from("cities").select("slug, name").order("name");
    if (error) throw error;
    return data ?? [];
  },
  ["city-list-v1"],
  { revalidate: 3600, tags: ["cities"] },
);
