"use client";

import { ExternalLink, MapPin, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { addTask, deleteTask, toggleTask, type StayFormState } from "@/app/estadia/actions";
import { buttonPrimary, field } from "@/components/ui/styles";
import { PHASE_LABEL, PHASE_ORDER, type Phase } from "@/lib/stay";
import type { StayTaskRow } from "@/lib/stayData";
import { track } from "@/lib/track";

function TaskItem({ task, citySlug }: { task: StayTaskRow; citySlug: string }) {
  const [done, setDone] = useState(task.done);
  const [pending, startTransition] = useTransition();
  const [gone, setGone] = useState(false);
  if (gone) return null;

  return (
    <li className="flex items-start gap-3 py-2.5">
      <input
        type="checkbox"
        checked={done}
        disabled={pending}
        aria-label={task.title}
        onChange={(e) => {
          const v = e.target.checked;
          setDone(v);
          startTransition(async () => {
            const res = await toggleTask(task.id, v);
            if (!res.ok) setDone(!v);
            else track("stay_task_toggle", { area: task.area, done: String(v) });
          });
        }}
        className="mt-1 size-5 shrink-0 accent-[var(--primary)]"
      />
      <div className="min-w-0 flex-1">
        <p className={`text-[15px] ${done ? "text-muted line-through" : ""}`}>{task.title}</p>
        {task.hint && <p className="text-xs text-muted">{task.hint}</p>}
        <div className="flex flex-wrap gap-x-3">
          {task.map_category && (
            <Link href={`/mapa/${citySlug}?cat=${task.map_category}`} className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-primary">
              <MapPin size={13} aria-hidden /> Abrir no mapa
            </Link>
          )}
          {task.source_url && (
            <a href={task.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-primary">
              <ExternalLink size={13} aria-hidden /> Fonte
            </a>
          )}
          {task.due_on && <span className="inline-flex min-h-11 items-center text-xs text-muted tabular-nums">até {new Date(`${task.due_on}T12:00:00`).toLocaleDateString("pt-BR")}</span>}
        </div>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => void ((await deleteTask(task.id)).ok && setGone(true)))}
        aria-label={`Remover ${task.title}`}
        className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2"
      >
        <Trash2 size={15} aria-hidden />
      </button>
    </li>
  );
}

function AddTask() {
  const [state, action, pending] = useActionState<StayFormState, FormData>(addTask, { status: "idle" });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "saved") ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-2 rounded-2xl bg-surface-2 p-3">
      <label htmlFor="new-task" className="text-sm font-semibold">
        Nova tarefa
      </label>
      <input id="new-task" name="title" required maxLength={120} placeholder="Ex.: renovar o chip" className={field} />
      <div className="grid grid-cols-2 gap-2">
        <select name="phase" defaultValue="ongoing" aria-label="Fase" className={field}>
          {PHASE_ORDER.map((p) => (
            <option key={p} value={p}>
              {PHASE_LABEL[p]}
            </option>
          ))}
        </select>
        <input name="due_on" type="date" aria-label="Prazo (opcional)" className={field} />
      </div>
      <button type="submit" disabled={pending} className={`${buttonPrimary} w-full`}>
        Adicionar
      </button>
      <p role="status" className="text-sm text-danger empty:hidden">
        {state.status === "error" ? state.message : null}
      </p>
    </form>
  );
}

/** E2: the stay checklist by phase; tasks with a map category open the filtered map. */
export function TaskList({ tasks, citySlug }: { tasks: StayTaskRow[]; citySlug: string }) {
  const byPhase = PHASE_ORDER.map((p) => [p, tasks.filter((t) => t.phase === p)] as [Phase, StayTaskRow[]]).filter(([, list]) => list.length > 0);
  return (
    <div className="space-y-5">
      {byPhase.map(([phase, list]) => (
        <section key={phase} aria-labelledby={`phase-${phase}`}>
          <h3 id={`phase-${phase}`} className="font-display text-lg font-bold">
            {PHASE_LABEL[phase]} <span className="text-sm font-normal text-muted tabular-nums">· {list.filter((t) => t.done).length}/{list.length}</span>
          </h3>
          <ul className="divide-y divide-line">
            {list.map((t) => (
              <TaskItem key={t.id} task={t} citySlug={citySlug} />
            ))}
          </ul>
        </section>
      ))}
      <AddTask />
    </div>
  );
}
