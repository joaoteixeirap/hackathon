"use client";

import { MessageCircle, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { buttonSecondary } from "@/components/ui/styles";
import { sharePage } from "@/lib/share";

/** WhatsApp first (where the audience is), then the native share sheet / copy link. */
export function ShareActions({ path, title, whenText }: { path: string; title: string; whenText: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [url, setUrl] = useState(path);
  useEffect(() => setUrl(new URL(path, window.location.origin).toString()), [path]);

  const waText = `${title} · ${whenText}\n${url}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(waText)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#1A8D47] px-6 font-semibold text-white shadow-soft-sm transition hover:brightness-105 active:scale-[0.98]"
      >
        <MessageCircle size={18} strokeWidth={1.75} aria-hidden /> Enviar no WhatsApp
      </a>
      <button
        type="button"
        className={`${buttonSecondary} gap-2`}
        onClick={async () => setMsg((await sharePage(path, title)) === "copied" ? "Link copiado" : null)}
      >
        <Share2 size={16} strokeWidth={1.75} aria-hidden /> Compartilhar
      </button>
      <span role="status" className="text-sm text-success">
        {msg}
      </span>
    </div>
  );
}
