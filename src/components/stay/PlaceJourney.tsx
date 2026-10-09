"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { hourLabel, WEEKDAY_LABEL } from "@/lib/series";
import type { IdleSlot } from "@/lib/journey";
export function IdleSlotLines({ slots }: { slots: IdleSlot[] }) {
  if (!slots.length) return null;
  return <div className="text-sm"><p className="font-semibold">Mesas livres</p>{slots.map(s => <p key={s.id}>{WEEKDAY_LABEL[s.weekday]} {hourLabel(s.start_time)}–{hourLabel(s.end_time)}{s.seats ? ` · ${s.seats} lugares` : ""}{s.note ? ` · ${s.note}` : ""}</p>)}<p className="text-xs text-muted">Declarado pelo local · {new Date(slots[0].created_at).toLocaleDateString("pt-BR")} · sem confirmação de pessoas</p></div>;
}
export function PlaceJourney({ placeId }: { placeId: string }) {
  const db = useMemo(() => createClient(), []);
  const [slots, setSlots] = useState<IdleSlot[]>([]);
  const [next, setNext] = useState<{ id: string; starts_at: string; capacity: number; people: number } | null>(null);
  useEffect(() => {
    let live = true;
    void (async () => {
      const [s, a] = await Promise.all([db.from("place_idle_slots").select("id, weekday, start_time, end_time, seats, note, created_at").eq("place_id", placeId).eq("active", true), db.from("activities").select("id, starts_at, capacity").eq("place_id", placeId).gt("starts_at", new Date().toISOString()).in("status", ["open", "full"]).order("starts_at").limit(1).maybeSingle()]);
      const count = a.data ? await db.rpc("approved_count", { p_activity_id: a.data.id }) : null;
      if (live) { setSlots(s.data ?? []); setNext(a.data ? { ...a.data, people: Number(count?.data ?? 0) + 1 } : null); }
    })();
    return () => { live = false; };
  }, [db, placeId]);
  return <div className="space-y-3"><IdleSlotLines slots={slots} />{next && <Link href={`/atividade/${next.id}`} className="block min-h-11 rounded-2xl bg-primary-soft p-3 text-sm font-semibold text-primary">Próxima sessão: {new Date(next.starts_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", hour: "2-digit", minute: "2-digit" })} · {next.people}/{next.capacity} pessoas</Link>}</div>;
}
