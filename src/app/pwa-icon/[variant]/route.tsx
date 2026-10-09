import { ImageResponse } from "next/og";

const VARIANTS = {
  "192": { size: 192, padding: 0.16 },
  "512": { size: 512, padding: 0.16 },
  // Maskable icons need the artwork inside the central 80% safe zone.
  "maskable-512": { size: 512, padding: 0.22 },
} as const;

type Variant = keyof typeof VARIANTS;

export const dynamic = "force-static";

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((variant) => ({ variant }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ variant: string }> }) {
  const { variant } = await params;
  const cfg = VARIANTS[variant as Variant];
  if (!cfg) return new Response("Not found", { status: 404 });
  const inner = Math.round(cfg.size * (1 - cfg.padding * 2));

  // Full-bleed coral (the OS applies its own mask/rounding); the glyph sits in the safe zone.
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#FF5B3A" }}>
        <svg width={inner} height={inner} viewBox="6 4 38 38">
          <path d="M10 38 C 16 38, 16 29, 22.5 29 S 30 24, 30 21" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeDasharray="0.5 5.5" />
          <path d="M31 6.5c-5.2 0-9.2 4-9.2 9.1 0 6.6 9.2 14.4 9.2 14.4s9.2-7.8 9.2-14.4c0-5.1-4-9.1-9.2-9.1Z" fill="#fff" />
          <circle cx="31" cy="15.6" r="3.4" fill="#FF5B3A" />
        </svg>
      </div>
    ),
    { width: cfg.size, height: cfg.size },
  );
}
