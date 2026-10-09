/** Brand mark: a compass star in a ring, "Solo" upright and "Rota" in italic. Single place to rename. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <circle cx="16" cy="16" r="14.5" fill="var(--papel-claro)" stroke="var(--tinta)" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="11.5" fill="none" stroke="var(--tinta)" strokeWidth="0.6" strokeDasharray="1.2 1.6" />
      <path d="M16 3.5 L18.6 16 L16 28.5 L13.4 16 Z" fill="var(--coral)" stroke="var(--tinta)" strokeWidth="1" strokeLinejoin="round" />
      <path d="M3.5 16 L16 13.8 L28.5 16 L16 18.2 Z" fill="var(--mare)" stroke="var(--tinta)" strokeWidth="1" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="1.8" fill="var(--papel-claro)" stroke="var(--tinta)" strokeWidth="1" />
    </svg>
  );
}

export function Logo({ className = "", size = 28 }: { className?: string; size?: number }) {
  return (
    <span className={`inline-flex items-center gap-2 font-serif text-xl font-bold leading-none text-tinta ${className}`}>
      <LogoMark size={size} />
      <span>
        Solo<span className="italic text-[color-mix(in_srgb,var(--coral)_78%,var(--tinta))]">Rota</span>
      </span>
    </span>
  );
}
