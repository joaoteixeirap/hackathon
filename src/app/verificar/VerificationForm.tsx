"use client";

import { Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonPrimary } from "@/components/ui/styles";
import { createClient } from "@/lib/supabase/client";
import { submitVerification } from "./actions";

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif" };

/** Uploads the selfie straight to the private bucket (only admins can read it), then registers the request. */
export function VerificationForm({ userId, maxBytes }: { userId: string; maxBytes: number }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !consent) return;
    const ext = EXT[file.type];
    if (!ext) return setError("Envie uma foto (JPG, PNG, WEBP ou HEIC).");
    if (file.size > maxBytes) return setError("A foto passa de 5 MB. Tire outra com qualidade menor.");

    setBusy(true);
    setError(null);
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error: upErr } = await createClient().storage.from("verifications").upload(path, file, { contentType: file.type });
    if (upErr) {
      setBusy(false);
      return setError("Não foi possível enviar a foto. Verifique a conexão e tente de novo.");
    }
    const res = await submitVerification(path);
    setBusy(false);
    if (!res.ok) return setError(res.message);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-surface-2 p-4 text-center hover:border-primary">
        <Camera size={28} className="text-primary" aria-hidden />
        <span className="font-semibold">{file ? file.name : "Tirar ou escolher a selfie com documento"}</span>
        <span className="text-xs text-muted">Rosto e documento com foto visíveis. Até 5 MB.</span>
        <input
          type="file"
          accept="image/*"
          capture="user"
          className="sr-only"
          onChange={(e) => {
            setError(null);
            setFile(e.target.files?.[0] ?? null);
          }}
        />
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" />
        <span>Autorizo a equipe SoloRota a ver esta foto só para confirmar minha identidade. Ela é apagada logo após a decisão.</span>
      </label>
      <button type="submit" disabled={!file || !consent || busy} className={`${buttonPrimary} w-full`}>
        {busy ? "Enviando…" : "Enviar para verificação"}
      </button>
      <p role="status" className="text-sm text-danger empty:hidden">
        {error}
      </p>
    </form>
  );
}
