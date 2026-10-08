export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-serif text-lg font-bold text-tinta ${className}`}>
      <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden>
        <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M16 4 L19 16 L16 28 L13 16 Z" fill="var(--coral)" stroke="currentColor" strokeWidth="1.2" />
      </svg>
      SoloRota
    </span>
  );
}
