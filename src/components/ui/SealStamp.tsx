/** "Selo Amigo do Nômade" rubber stamp (DESIGN.md §1). */
export function SealStamp({ size = 88, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Selo Amigo do Nômade"
      className={`-rotate-[9deg] text-mare ${className}`}
    >
      <defs>
        <path id="seal-arc-top" d="M 20 50 A 30 30 0 0 1 80 50" />
        <path id="seal-arc-bottom" d="M 14 50 A 36 36 0 0 0 86 50" />
        <filter id="seal-rough">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" />
        </filter>
      </defs>
      <g filter="url(#seal-rough)" fill="none" stroke="currentColor">
        <circle cx="50" cy="50" r="46" strokeWidth="3" />
        <circle cx="50" cy="50" r="41" strokeWidth="1" strokeDasharray="3 2.5" />
        <circle cx="50" cy="50" r="19" strokeWidth="1.5" />
        <text fill="currentColor" stroke="none" fontSize="10" fontWeight="700" letterSpacing="1.8" fontFamily="var(--font-sans)">
          <textPath href="#seal-arc-top" startOffset="50%" textAnchor="middle">
            AMIGO DO
          </textPath>
        </text>
        <text fill="currentColor" stroke="none" fontSize="10" fontWeight="700" letterSpacing="1.8" fontFamily="var(--font-sans)">
          <textPath href="#seal-arc-bottom" startOffset="50%" textAnchor="middle" dominantBaseline="hanging">
            NÔMADE
          </textPath>
        </text>
        <g transform="translate(38 38)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h.01" />
          <path d="M2 8.82a15 15 0 0 1 20 0" />
          <path d="M5 12.859a10 10 0 0 1 14 0" />
          <path d="M8.5 16.429a5 5 0 0 1 7 0" />
        </g>
      </g>
    </svg>
  );
}
