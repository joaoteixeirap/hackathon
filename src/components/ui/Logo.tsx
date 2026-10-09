/**
 * SoloRota brand mark: a coral squircle with a white map pin at the end of a dotted route.
 * Single place to rename or restyle the brand.
 */
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden className={className}>
      <rect width="48" height="48" rx="14" fill="#FF5B3A" />
      <path
        d="M10 38 C 16 38, 16 29, 22.5 29 S 30 24, 30 21"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="0.5 5.5"
      />
      <path d="M31 6.5c-5.2 0-9.2 4-9.2 9.1 0 6.6 9.2 14.4 9.2 14.4s9.2-7.8 9.2-14.4c0-5.1-4-9.1-9.2-9.1Z" fill="#fff" />
      <circle cx="31" cy="15.6" r="3.4" fill="#FF5B3A" />
    </svg>
  );
}

export function Logo({ className = "", size = 32 }: { className?: string; size?: number }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span className="font-display text-[22px] leading-none font-extrabold tracking-[-0.03em] text-ink">
        solo<span className="text-accent-strong">rota</span>
      </span>
    </span>
  );
}
