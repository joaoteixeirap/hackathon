import { ArrowLeft } from "lucide-react";
import { Logo } from "./Logo";
import { MapLink } from "./MapLink";

/** Page layout for non-map screens. */
/** `wide` gives desktop pages with side-by-side columns more room; phones are unaffected. */
export function PageShell({ title, children, wide = false }: { title: string; children: React.ReactNode; wide?: boolean }) {
  const width = wide ? "max-w-xl lg:max-w-6xl" : "max-w-xl";
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-line bg-canvas/85 backdrop-blur-md" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className={`mx-auto flex h-16 ${width} items-center justify-between px-4`}>
          <MapLink aria-label="SoloRota, voltar ao mapa" className="flex min-h-11 items-center">
            <Logo size={30} />
          </MapLink>
          <MapLink
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink hover:bg-surface-2"
          >
            <ArrowLeft size={16} aria-hidden /> Mapa
          </MapLink>
        </div>
      </header>
      <main className={`mx-auto ${width} px-4 pb-28 lg:pb-16`}>
        <h1 className="mt-6 mb-6 font-display text-[32px] leading-[1.1] font-bold tracking-[-0.02em] text-balance">{title}</h1>
        {children}
      </main>
    </div>
  );
}
