"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { createClient, syncRealtimeAuth } from "@/lib/supabase/client";

/**
 * Re-renders the activity page when its membership or status changes (approvals, new
 * requests, "lotada"), so the queue, the visitor's state and "R$ X por pessoa" stay live.
 * Realtime applies RLS: each visitor only hears about rows they are allowed to read.
 * `userId` is in the deps so the channel re-subscribes with the new token once a guest
 * session starts on this page.
 */
export function ActivityLive({ activityId, userId }: { activityId: string; userId: string | null }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 250);
    };
    const channel = supabase
      .channel(`activity:${activityId}:${userId ?? "anon"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_members", filter: `activity_id=eq.${activityId}` }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "activities", filter: `id=eq.${activityId}` }, refresh);
    syncRealtimeAuth(supabase).then(() => {
      if (!cancelled) channel.subscribe();
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [supabase, router, activityId, userId]);

  return null;
}
