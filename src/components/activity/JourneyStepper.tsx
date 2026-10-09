export function JourneyStepper({ group, benefit, recorded }: { group: boolean; benefit: boolean; recorded: boolean }) {
  return <ol aria-label="Jornada da sessão" className="flex flex-wrap gap-2 text-xs">{[["Local", true], ["Grupo", group], ["Benefício", benefit], ["Registro", recorded]].map(([text, done]) => <li key={String(text)} className={`rounded-full px-3 py-2 ${done ? "bg-primary-soft text-primary" : "bg-surface-2 text-muted"}`}>{done ? "✓ " : "○ "}{text}</li>)}</ol>;
}
