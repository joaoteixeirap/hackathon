import "server-only";
import { createClient } from "./supabase/server";
import type { Stay, StayTask } from "./stay";

export type StayTaskRow = StayTask & { hint: string | null; map_category: string | null; source_url: string | null };
export type FavoriteRow = { place_id: string; note: string | null; name: string; category: string; subcategory: string | null; neighborhood: string | null; lat: number; lng: number };
export type Commitment = { id: string; title: string; starts_at: string; meeting_label: string | null; role: "creator" | "approved" };
export type PostSessionPrompt = { activity_id: string; title: string; place: { id: string; name: string; lat: number; lng: number } };

export async function getActiveStay(userId: string): Promise<(Stay & { city: { slug: string; name: string } }) | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("stays")
    .select("id, city_id, arrive_on, leave_on, audience, active, cities(slug, name)")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();
  if (!data) return null;
  const { cities, ...stay } = data as unknown as Stay & { cities: { slug: string; name: string } };
  return { ...stay, city: cities };
}

export async function getStayTasks(stayId: string): Promise<StayTaskRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("stay_tasks")
    .select("id, template_id, title, area, phase, due_on, done, stay_task_templates(hint, map_category, source_url, sort)")
    .eq("stay_id", stayId)
    .order("created_at");
  type Row = StayTask & { stay_task_templates: { hint: string | null; map_category: string | null; source_url: string | null; sort: number } | null };
  const rows = (data ?? []) as unknown as Row[];
  // Template order first (sort), then the user's own tasks in creation order.
  const order = new Map(rows.map((r) => [r.id, r.stay_task_templates?.sort ?? 1000]));
  return rows
    .map(({ stay_task_templates: t, ...task }) => ({ ...task, hint: t?.hint ?? null, map_category: t?.map_category ?? null, source_url: t?.source_url ?? null }))
    .sort((a, b) => order.get(a.id)! - order.get(b.id)!);
}

export async function getFavorites(userId: string): Promise<FavoriteRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("place_favorites")
    .select("place_id, note, places(name, category, subcategory, neighborhood, lat, lng)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  type Row = { place_id: string; note: string | null; places: Omit<FavoriteRow, "place_id" | "note"> | null };
  return ((data ?? []) as unknown as Row[]).filter((r) => r.places).map((r) => ({ place_id: r.place_id, note: r.note, ...r.places! }));
}

export async function isFavorite(userId: string, placeId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("place_favorites").select("place_id").eq("user_id", userId).eq("place_id", placeId).maybeSingle();
  return Boolean(data);
}

/** Upcoming activities the user created or was approved in (agenda), soonest first. */
export async function getCommitments(userId: string, limit = 20): Promise<Commitment[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const [created, joined] = await Promise.all([
    supabase.from("activities").select("id, title, starts_at, meeting_label").eq("creator_id", userId).neq("status", "cancelled").gt("ends_at", nowIso).order("starts_at").limit(limit),
    supabase.from("activity_members").select("activities!inner(id, title, starts_at, ends_at, meeting_label, status)").eq("user_id", userId).eq("status", "approved").gt("activities.ends_at", nowIso).neq("activities.status", "cancelled").limit(limit),
  ]);
  const mine: Commitment[] = (created.data ?? []).map((a) => ({ ...(a as Omit<Commitment, "role">), role: "creator" }));
  const theirs: Commitment[] = ((joined.data ?? []) as unknown as { activities: Omit<Commitment, "role"> }[]).map((m) => ({ ...m.activities, role: "approved" }));
  return [...mine, ...theirs].sort((a, b) => a.starts_at.localeCompare(b.starts_at)).slice(0, limit);
}

/**
 * J4: activities at a place that ended in the last 24 h, where the user took part and has not
 * registered a check-in for that activity yet.
 */
export async function getPostSessionPrompts(userId: string): Promise<PostSessionPrompt[]> {
  const supabase = await createClient();
  const now = Date.now();
  const since = new Date(now - 86_400_000).toISOString();
  const nowIso = new Date(now).toISOString();
  const select = "id, title, place_id, places(name, lat, lng)";
  const [created, joined, done] = await Promise.all([
    supabase.from("activities").select(select).eq("creator_id", userId).not("place_id", "is", null).gte("ends_at", since).lte("ends_at", nowIso),
    supabase.from("activity_members").select(`activities!inner(${select}, ends_at)`).eq("user_id", userId).eq("status", "approved").gte("activities.ends_at", since).lte("activities.ends_at", nowIso),
    supabase.from("place_checkins").select("activity_id").eq("user_id", userId).not("activity_id", "is", null).gte("created_at", since),
  ]);
  type A = { id: string; title: string; place_id: string | null; places: { name: string; lat: number; lng: number } | null };
  const all: A[] = [...((created.data ?? []) as unknown as A[]), ...((joined.data ?? []) as unknown as { activities: A }[]).map((m) => m.activities)];
  const answered = new Set((done.data ?? []).map((r) => r.activity_id));
  return all
    .filter((a) => a.place_id && a.places && !answered.has(a.id))
    .map((a) => ({ activity_id: a.id, title: a.title, place: { id: a.place_id!, ...a.places! } }));
}
