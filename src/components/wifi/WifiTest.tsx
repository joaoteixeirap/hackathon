"use client";

import { Gauge, Wifi } from "lucide-react";
import { useState } from "react";
import { saveWifiTest, type WifiSaveResult } from "@/app/lugar/[id]/actions";
import { buttonPrimary, buttonSecondary } from "@/components/ui/styles";
import { DOWNLOAD_STEPS, mbps, median, nextStep, PING_SAMPLES, roundMbps, TEST_BUDGET_MS } from "@/lib/wifi";

type Result = { download: number; ping: number | null };
type Saved = Extract<WifiSaveResult, { ok: true }>;

const url = (bytes: number) => `/api/speedtest?bytes=${bytes}&t=${Date.now()}-${Math.random().toString(36).slice(2)}`;

async function timeFetch(bytes: number, signal: AbortSignal): Promise<{ ms: number; bytes: number }> {
  const t0 = performance.now();
  const res = await fetch(url(bytes), { cache: "no-store", signal });
  const body = await res.arrayBuffer();
  return { ms: performance.now() - t0, bytes: body.byteLength };
}

/** Runs ping and download against our own server, in under 15 s (F12). */
async function runTest(onProgress: (text: string) => void): Promise<Result> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TEST_BUDGET_MS + 2000);
  try {
    const started = performance.now();
    onProgress("Medindo o ping…");
    await timeFetch(0, controller.signal); // warm up the connection
    const pings: number[] = [];
    for (let i = 0; i < PING_SAMPLES; i++) pings.push((await timeFetch(0, controller.signal)).ms);

    const speeds: number[] = [];
    let size: number | null = DOWNLOAD_STEPS[0];
    while (size != null) {
      onProgress("Medindo o download…");
      const s = await timeFetch(size, controller.signal);
      const v = mbps(s.bytes, s.ms);
      speeds.push(v);
      onProgress(`Medindo o download… ${roundMbps(v).toLocaleString("pt-BR")} Mbps`);
      size = nextStep(size, s.ms, performance.now() - started);
    }
    // The biggest (last) sample is the most reliable; earlier ones are mostly latency.
    return { download: roundMbps(speeds[speeds.length - 1]), ping: median(pings) };
  } finally {
    clearTimeout(timeout);
  }
}

export function WifiTest({ placeId, placeName, onSaved }: { placeId: string; placeName: string; onSaved: (s: Saved) => void }) {
  const [phase, setPhase] = useState<"idle" | "running" | "result" | "saving" | "saved">("idle");
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    setPhase("running");
    try {
      setResult(await runTest(setProgress));
      setPhase("result");
    } catch {
      setError("O teste não terminou. Verifique a conexão e tente de novo.");
      setPhase("idle");
    }
  }

  async function save() {
    if (!result) return;
    setPhase("saving");
    const res = await saveWifiTest(placeId, result.download, result.ping);
    if (res.ok) {
      onSaved(res);
      setPhase("saved");
    } else {
      setError(res.message);
      setPhase("result");
    }
  }

  return (
    <div className="space-y-2" aria-live="polite">
      {phase === "idle" && (
        <button type="button" onClick={start} className={`${buttonSecondary} min-h-11 gap-2 px-4 text-sm`}>
          <Gauge size={16} aria-hidden /> Medir Wi-Fi
        </button>
      )}
      {phase === "running" && (
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Wifi size={16} className="motion-safe:animate-pulse text-cat-work" aria-hidden /> {progress}
        </p>
      )}
      {(phase === "result" || phase === "saving") && result && (
        <div className="space-y-2 rounded-2xl border border-line bg-surface p-3">
          <p className="font-display text-2xl font-bold tabular-nums" data-testid="wifi-result">
            {result.download.toLocaleString("pt-BR")} <span className="font-sans text-sm font-semibold text-muted">Mbps</span>
            {result.ping != null && <span className="ml-2 font-sans text-sm font-semibold text-muted">· ping {Math.round(result.ping)} ms</span>}
          </p>
          <p className="text-sm">Você está conectado ao Wi-Fi de {placeName}? Só salve se estiver.</p>
          <div className="flex gap-2">
            <button type="button" disabled={phase === "saving"} onClick={save} className={`${buttonPrimary} min-h-11 flex-1 px-4 text-sm`}>
              {phase === "saving" ? "Salvando…" : "Sim, salvar medição"}
            </button>
            <button type="button" onClick={() => setPhase("idle")} className={`${buttonSecondary} min-h-11 px-4 text-sm`}>
              Descartar
            </button>
          </div>
        </div>
      )}
      {phase === "saved" && <p className="text-sm font-semibold text-success">Obrigado! Sua medição entrou na ficha.</p>}
      <p role="status" className="text-sm text-danger empty:hidden">
        {error}
      </p>
    </div>
  );
}
