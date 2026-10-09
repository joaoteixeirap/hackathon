"use client";

import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * "Avisar contato de confiança" (F14): a read-only itinerary (title, time, meeting point, map)
 * sent over WhatsApp. No names or profiles from the group go in the message.
 */
export function TrustedContact({ path, title, whenText, meetingLabel, directions }: { path: string; title: string; whenText: string; meetingLabel: string | null; directions: string }) {
  const [url, setUrl] = useState(path);
  useEffect(() => setUrl(new URL(path, window.location.origin).toString()), [path]);

  const text = [
    `Vou a um encontro marcado pelo SoloRota: ${title}.`,
    `Quando: ${whenText}.`,
    `Onde: ${meetingLabel ?? "ponto marcado no mapa"} (${directions}).`,
    `Roteiro: ${url}`,
  ].join("\n");

  return (
    <a
      href={`https://wa.me/?text=${encodeURIComponent(text)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary underline-offset-4 hover:underline"
    >
      <ShieldCheck size={16} className="text-success" aria-hidden /> Avisar um contato de confiança
    </a>
  );
}
