import { ImageResponse } from "next/og";

const VARIANTS = {
  "192": { size: 192, padding: 0.12 },
  "512": { size: 512, padding: 0.12 },
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

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F3EAD7",
        }}
      >
        <svg width={inner} height={inner} viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="29" fill="none" stroke="#1F2A30" strokeWidth="3" />
          <path d="M32 6 L38.5 32 L32 58 L25.5 32 Z" fill="#E8603C" stroke="#1F2A30" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="32" cy="32" r="3.5" fill="#1F2A30" />
        </svg>
      </div>
    ),
    { width: cfg.size, height: cfg.size },
  );
}
