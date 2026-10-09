"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

/** Code + QR shown at the counter, valid for 10 minutes after redemption (F11). */
export function OfferTicket({ code, expiresAt, title }: { code: string; expiresAt: string; title: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [left, setLeft] = useState(() => new Date(expiresAt).getTime() - Date.now());

  useEffect(() => {
    QRCode.toString(code, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0f1f2a", light: "#ffffff" } })
      .then(setSvg)
      .catch(() => setSvg(null));
  }, [code]);

  useEffect(() => {
    const end = new Date(expiresAt).getTime();
    const tick = () => setLeft(end - Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  const expired = left <= 0;
  const mm = String(Math.max(0, Math.floor(left / 60_000))).padStart(2, "0");
  const ss = String(Math.max(0, Math.floor((left % 60_000) / 1000))).padStart(2, "0");

  return (
    <div className="space-y-3 rounded-2xl border-2 border-dashed border-accent bg-surface p-4 text-center" aria-live="polite">
      <p className="text-sm font-semibold text-muted">{expired ? "Código expirado" : "Mostre no caixa"}</p>
      {!expired && svg && (
        // Generated locally from the code; no external image.
        <div role="img" aria-label={`QR code do código ${code}`} className="mx-auto size-44 rounded-xl bg-white p-1" dangerouslySetInnerHTML={{ __html: svg }} />
      )}
      <p className={`font-display text-3xl font-bold tracking-[0.2em] tabular-nums ${expired ? "text-muted line-through" : ""}`} data-testid="offer-code">
        {code}
      </p>
      <p className="text-sm">{title}</p>
      <p className={`text-sm font-semibold tabular-nums ${expired ? "text-muted" : "text-accent-strong"}`}>
        {expired ? "Válido só por 10 minutos após o resgate." : `Vale por mais ${mm}:${ss}`}
      </p>
    </div>
  );
}
