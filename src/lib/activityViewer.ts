import "server-only";
import { getUser } from "./auth";
import { isParticipant, viewerRole, type MemberStatus, type Person, type ViewerRole } from "./membership";
import { createClient } from "./supabase/server";
import { verificationRequired as isVerificationRequired } from "./verification";

export type ChatMessage = { id: string; user_id: string; body: string; created_at: string; author: string };

export type ActivityViewer = {
  userId: string | null;
  role: ViewerRole;
  verificationRequired: boolean;
  /** Creator + queue for the creator, the group for members, empty for everyone else (RLS). */
  people: Person[];
  /** Latest messages, participants only. */
  messages: ChatMessage[];
  /** Profiles the viewer already reviewed. */
  reviewed: string[];
};

const CHAT_HISTORY = 200;

export async function loadActivityViewer(activityId: string, creatorId: string): Promise<ActivityViewer> {
  const supabase = await createClient();
  const [user, verificationRequired] = await Promise.all([getUser(), isVerificationRequired()]);

  if (!user) {
    return {
      userId: null,
      role: viewerRole({ userId: null, creatorId, status: null, verified: false, verificationRequired }),
      verificationRequired,
      people: [],
      messages: [],
      reviewed: [],
    };
  }

  const [memberRes, meRes, peopleRes] = await Promise.all([
    supabase.from("activity_members").select("status").eq("activity_id", activityId).eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("verified").eq("id", user.id).maybeSingle(),
    supabase.rpc("activity_people", { p_activity_id: activityId }),
  ]);
  const role = viewerRole({
    userId: user.id,
    creatorId,
    status: (memberRes.data?.status as MemberStatus | undefined) ?? null,
    verified: meRes.data?.verified ?? false,
    verificationRequired,
  });
  const people = ((peopleRes.data ?? []) as Person[]).map((p) => ({
    ...p,
    avg_rating: p.avg_rating == null ? null : Number(p.avg_rating),
  }));

  if (!isParticipant(role)) return { userId: user.id, role, verificationRequired, people, messages: [], reviewed: [] };

  const [msgRes, reviewRes] = await Promise.all([
    supabase
      .from("messages")
      .select("id, user_id, body, created_at, profiles(display_name)")
      .eq("activity_id", activityId)
      .order("created_at", { ascending: false })
      .limit(CHAT_HISTORY),
    supabase
      .from("reviews")
      .select("target_id")
      .eq("author_id", user.id)
      .eq("target_type", "profile")
      .in(
        "target_id",
        people.map((p) => p.user_id),
      ),
  ]);
  const messages = ((msgRes.data ?? []) as unknown as (Omit<ChatMessage, "author"> & { profiles: { display_name: string } | null })[])
    .map(({ profiles, ...m }) => ({ ...m, author: profiles?.display_name ?? "Ex-participante" }))
    .reverse();

  return {
    userId: user.id,
    role,
    verificationRequired,
    people,
    messages,
    reviewed: (reviewRes.data ?? []).map((r) => r.target_id as string),
  };
}
