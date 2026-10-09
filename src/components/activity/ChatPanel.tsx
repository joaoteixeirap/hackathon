"use client";

import { Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { field } from "@/components/ui/styles";
import type { ChatMessage } from "@/lib/activityViewer";
import { cleanMessage, MESSAGE_MAX } from "@/lib/membership";
import { createClient, syncRealtimeAuth } from "@/lib/supabase/client";
import { ReportButton } from "./ReportButton";

const TZ = "America/Sao_Paulo";
const time = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });

/**
 * Group chat (F5): creator and approved members only (RLS on `messages`).
 * New messages arrive through Supabase Realtime; sending inserts directly as the user.
 */
export function ChatPanel({
  activityId,
  userId,
  initial,
  names,
  readOnly,
}: {
  activityId: string;
  userId: string;
  initial: ChatMessage[];
  /** user_id → display name for people already known on the page */
  names: Record<string, string>;
  readOnly: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState(initial);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const namesRef = useRef(names);
  namesRef.current = names;

  const add = (m: ChatMessage) =>
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m].sort((a, b) => a.created_at.localeCompare(b.created_at))));

  useEffect(() => {
    let cancelled = false;
    const channel = supabase
      .channel(`chat:${activityId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `activity_id=eq.${activityId}` },
        async (payload) => {
          const row = payload.new as Omit<ChatMessage, "author">;
          let author = namesRef.current[row.user_id];
          if (!author) {
            const { data } = await supabase.from("profiles").select("display_name").eq("id", row.user_id).maybeSingle();
            author = data?.display_name ?? "Participante";
          }
          add({ ...row, author });
        },
      );
    syncRealtimeAuth(supabase).then(() => {
      if (!cancelled) channel.subscribe();
    });
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase, activityId]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = cleanMessage(draft);
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("messages")
      .insert({ activity_id: activityId, user_id: userId, body })
      .select("id, user_id, body, created_at")
      .single();
    setSending(false);
    if (err || !data) {
      setError("Mensagem não enviada. Verifique a conexão e tente de novo.");
      return;
    }
    setDraft("");
    add({ ...data, author: names[userId] ?? "Você" });
  }

  return (
    <div className="flex flex-col gap-3">
      <ol ref={listRef} aria-live="polite" aria-label="Mensagens do grupo" className="max-h-[55dvh] min-h-40 space-y-2 overflow-y-auto overscroll-contain rounded-2xl bg-surface-2 p-3">
        {messages.length === 0 && <li className="py-6 text-center text-sm text-muted">Ninguém falou ainda. Diga oi e combine os detalhes.</li>}
        {messages.map((m) => {
          const mine = m.user_id === userId;
          return (
            <li key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 shadow-soft-sm ${mine ? "rounded-br-md bg-primary text-on-fill" : "rounded-bl-md bg-surface"}`}>
                {!mine && <p className="text-xs font-bold text-primary">{m.author}</p>}
                <p className="break-words whitespace-pre-line">{m.body}</p>
              </div>
              <p className="flex items-center gap-1 px-1 text-[11px] text-muted">
                <time dateTime={m.created_at}>{time(m.created_at)}</time>
                {!mine && <ReportButton targetType="message" targetId={m.id} />}
              </p>
            </li>
          );
        })}
      </ol>

      {readOnly ? (
        <p className="text-sm text-muted">O chat fica só para leitura depois que a roda termina.</p>
      ) : (
        <form onSubmit={send} className="flex items-end gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Mensagem
          </label>
          <textarea
            id="chat-input"
            rows={1}
            maxLength={MESSAGE_MAX}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Escreva para o grupo"
            className={`${field} max-h-32 resize-none`}
          />
          <button
            type="submit"
            disabled={sending || !cleanMessage(draft)}
            aria-label="Enviar mensagem"
            className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-on-fill shadow-soft-sm transition hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            <Send size={18} aria-hidden />
          </button>
        </form>
      )}
      <p role="status" className="text-sm text-danger empty:hidden">
        {error}
      </p>
    </div>
  );
}
