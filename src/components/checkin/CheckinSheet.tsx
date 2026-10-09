"use client";

import { Gauge, MapPin, Signal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { submitCheckin } from "@/app/lugar/[id]/actions";
import { buttonPrimary, buttonSecondary, field } from "@/components/ui/styles";
import { CHECKIN_COMMENT_MAX, NEAR_PLACE_METERS } from "@/config/nomad";
import { haversine } from "@/lib/geo";
import { CALL_LABEL, CROWD_LABEL, NOISE_LABEL, OUTLETS_LABEL, STAY_LABEL, type CallResult, type OutletsLevel, type PlaceTrust, type StayPolicy } from "@/lib/placeTrust";
import type { SpeedResult } from "@/lib/speedtest";
import { track } from "@/lib/track";
import { runSpeedTest, type SpeedProgress } from "./runSpeedTest";

type Props = {
  place: { id: string; name: string; lat: number; lng: number };
  activityId?: string | null;
  onClose: () => void;
  onSaved: (trust: PlaceTrust, helped: number) => void;
};

type Step = "confirm" | "measure" | "report" | "done";

function Choice<T extends string | number>({ name, options, value, onChange }: { name: string; options: [T, string][]; value: T | null; onChange: (v: T | null) => void }) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-1.5">
      {options.map(([v, label]) => (
        <button
          key={String(v)}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(value === v ? null : v)}
          className={`min-h-11 rounded-full border px-3.5 text-sm font-semibold transition ${value === v ? "border-transparent bg-primary text-on-fill" : "border-line bg-surface hover:bg-surface-2"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** "Medir agora" (SPEC_V2 R1): confirm → measure → quick report, in about a minute. */
export function CheckinSheet({ place, activityId = null, onClose, onSaved }: Props) {
  const [step, setStep] = useState<Step>("confirm");
  const [onVenue, setOnVenue] = useState(false);
  const [cellular, setCellular] = useState(false);
  const [near, setNear] = useState<{ state: "idle" | "asking" | "near" | "far" | "denied" }>({ state: "idle" });
  const [progress, setProgress] = useState<SpeedProgress | null>(null);
  const [speed, setSpeed] = useState<(SpeedResult & { partial: boolean }) | null>(null);
  const [speedError, setSpeedError] = useState<string | null>(null);
  const [outlets, setOutlets] = useState<OutletsLevel | null>(null);
  const [noise, setNoise] = useState<number | null>(null);
  const [call, setCall] = useState<CallResult | null>(null);
  const [stay, setStay] = useState<StayPolicy | null>(null);
  const [crowd, setCrowd] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [helped, setHelped] = useState(0);
  const cancelRef = useRef<AbortController | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  // The parent passes a new onClose on every render; keep it in a ref so the mount effect
  // (whose cleanup cancels a running measurement) runs once, not on every parent render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    track("checkin_start", { place_id: place.id });
    const conn = (navigator as Navigator & { connection?: { type?: string } }).connection;
    setCellular(conn?.type === "cellular");
    dialogRef.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("keydown", esc);
      cancelRef.current?.abort();
    };
  }, [place.id]);

  function checkNear() {
    if (!("geolocation" in navigator)) return setNear({ state: "denied" });
    setNear({ state: "asking" });
    navigator.geolocation.getCurrentPosition(
      // Only the distance is used; the coordinates are dropped right here (I5c).
      (pos) => setNear({ state: haversine({ lat: pos.coords.latitude, lng: pos.coords.longitude }, place) <= NEAR_PLACE_METERS ? "near" : "far" }),
      () => setNear({ state: "denied" }),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  async function measure() {
    setStep("measure");
    setSpeedError(null);
    const c = new AbortController();
    cancelRef.current = c;
    try {
      const r = await runSpeedTest(c.signal, setProgress);
      setSpeed(r);
      if (r.download_mbps == null) setSpeedError("A medição não terminou. Você ainda pode enviar o relato.");
      else if (r.partial) setSpeedError("A rede está lenta: salvamos o que deu para medir em 15 s.");
      setStep("report");
    } catch {
      setStep("confirm"); // cancelled
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    const measured = speed?.download_mbps != null;
    const res = await submitCheckin({
      place_id: place.id,
      activity_id: activityId,
      ...(measured ? speed : {}),
      on_venue_wifi: onVenue,
      near_place: near.state === "near",
      outlets_level: outlets,
      noise_level: noise,
      call_result: call ?? "not_tested",
      stay_policy: stay,
      crowd_level: crowd,
      comment,
    });
    setSaving(false);
    if (!res.ok) return setError(res.message);
    track("checkin_submit", { place_id: place.id, measured: String(measured), near_place: String(near.state === "near") });
    if (activityId) track("post_checkin_submit", { activity_id: activityId });
    setHelped(res.helped ?? 0);
    onSaved(res.trust, res.helped ?? 0);
    setStep("done");
  }

  const stepNo = step === "confirm" ? 1 : step === "measure" ? 2 : 3;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkin-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-surface p-5 shadow-soft-lg outline-none sm:rounded-[28px]"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-muted tabular-nums">{step === "done" ? "Registrado" : `Passo ${stepNo} de 3`}</p>
            <h2 id="checkin-title" className="font-display text-xl leading-tight font-bold">
              Medir agora · {place.name}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2">
            <X size={18} aria-hidden />
          </button>
        </header>

        {step === "confirm" && (
          <div className="space-y-4">
            <label className="flex min-h-11 items-start gap-3 rounded-2xl bg-surface-2 p-3">
              <input type="checkbox" checked={onVenue} onChange={(e) => setOnVenue(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" />
              <span>
                <span className="font-semibold">Estou no Wi-Fi deste local</span>
                <span className="block text-sm text-muted">Necessário para a medição valer para a ficha.</span>
              </span>
            </label>
            {cellular && (
              <p className="flex items-start gap-2 rounded-2xl bg-accent-soft p-3 text-sm">
                <Signal size={16} className="mt-0.5 shrink-0 text-accent-strong" aria-hidden />
                Parece que você está nos dados móveis. Conecte no Wi-Fi do local antes de medir.
              </p>
            )}
            <div className="space-y-1.5">
              <button type="button" onClick={checkNear} disabled={near.state === "asking"} className={`${buttonSecondary} min-h-11 gap-2 px-4 text-sm`}>
                <MapPin size={16} aria-hidden /> Confirmar que estou no local (opcional)
              </button>
              <p role="status" className="text-xs text-muted">
                {near.state === "asking" && "Perguntando a localização…"}
                {near.state === "near" && "Confirmado: você está no local. Guardamos só isso, nunca sua posição."}
                {near.state === "far" && `Você parece estar a mais de ${NEAR_PLACE_METERS} m. Tudo bem, a medição vale mesmo assim.`}
                {near.state === "denied" && "Sem localização. Tudo bem, é opcional."}
                {near.state === "idle" && "Usamos só para saber se você está a até 150 m; a posição não é gravada."}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={measure} disabled={!onVenue} className={`${buttonPrimary} gap-2`}>
                <Gauge size={18} aria-hidden /> Medir a conexão
              </button>
              <button type="button" onClick={() => setStep("report")} className="min-h-11 text-sm font-semibold text-primary">
                Só relatar, sem medir
              </button>
            </div>
          </div>
        )}

        {step === "measure" && (
          <div className="space-y-4" aria-live="polite">
            <div className="h-3 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((progress?.fraction ?? 0) * 100)} aria-label="Progresso da medição">
              <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${Math.round((progress?.fraction ?? 0.02) * 100)}%` }} />
            </div>
            <p className="font-semibold tabular-nums">{progress?.text ?? "Começando…"}</p>
            <p className="text-xs text-muted">Medido até o servidor do SoloRota; o resultado varia com o horário e o dispositivo.</p>
            <button type="button" onClick={() => cancelRef.current?.abort()} className={`${buttonSecondary} w-full`}>
              Cancelar
            </button>
          </div>
        )}

        {step === "report" && (
          <div className="space-y-4">
            {speed?.download_mbps != null && (
              <dl className="grid grid-cols-3 gap-2 rounded-2xl bg-surface-2 p-3 text-center tabular-nums" data-testid="speed-result">
                <div>
                  <dt className="text-xs text-muted">Download</dt>
                  <dd className="font-display text-lg font-bold">{speed.download_mbps.toLocaleString("pt-BR")}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Upload</dt>
                  <dd className="font-display text-lg font-bold">{speed.upload_mbps?.toLocaleString("pt-BR") ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Ping</dt>
                  <dd className="font-display text-lg font-bold">{speed.ping_ms != null ? `${Math.round(speed.ping_ms)} ms` : "—"}</dd>
                </div>
                <p className="col-span-3 text-xs text-muted">
                  Mbps · jitter {speed.jitter_ms ?? "—"} ms · perda {speed.loss_pct}% · indicativo
                </p>
              </dl>
            )}
            {speedError && <p className="text-sm text-accent-strong">{speedError}</p>}
            <p className="text-sm text-muted">Tudo opcional. Leva uns 20 segundos.</p>
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-semibold">Tomadas</legend>
              <Choice name="Tomadas" value={outlets} onChange={setOutlets} options={(Object.keys(OUTLETS_LABEL) as OutletsLevel[]).map((k) => [k, OUTLETS_LABEL[k]])} />
            </fieldset>
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-semibold">Ruído</legend>
              <Choice name="Ruído" value={noise} onChange={setNoise} options={[1, 2, 3, 4, 5].map((n) => [n, NOISE_LABEL[n]] as [number, string])} />
            </fieldset>
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-semibold">Testei chamada de vídeo aqui</legend>
              <Choice name="Chamada de vídeo" value={call} onChange={setCall} options={(["ok", "choppy", "failed", "not_tested"] as CallResult[]).map((k) => [k, CALL_LABEL[k]])} />
            </fieldset>
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-semibold">Dá para ficar trabalhando?</legend>
              <Choice name="Permanência" value={stay} onChange={setStay} options={(Object.keys(STAY_LABEL) as StayPolicy[]).map((k) => [k, STAY_LABEL[k]])} />
            </fieldset>
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-semibold">Lotação agora</legend>
              <Choice name="Lotação" value={crowd} onChange={setCrowd} options={[1, 2, 3, 4, 5].map((n) => [n, CROWD_LABEL[n]] as [number, string])} />
            </fieldset>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold">Comentário</span>
              <input value={comment} onChange={(e) => setComment(e.target.value)} maxLength={CHECKIN_COMMENT_MAX} placeholder="Ex.: mesas do fundo têm tomada" className={field} />
            </label>
            <button type="button" onClick={save} disabled={saving} className={`${buttonPrimary} w-full`}>
              {saving ? "Salvando…" : "Salvar check-in"}
            </button>
            <p role="status" className="text-sm text-danger empty:hidden">
              {error}
            </p>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4" role="status">
            <p className="font-display text-xl font-bold">Obrigado!</p>
            <p>
              Seu registro já aparece na ficha com a data de hoje.
              {helped > 0 && ` Você ajudou ${helped} ${helped === 1 ? "pessoa" : "pessoas"} que abriram esta ficha no último mês.`}
            </p>
            <button type="button" onClick={onClose} className={`${buttonPrimary} w-full`}>
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
