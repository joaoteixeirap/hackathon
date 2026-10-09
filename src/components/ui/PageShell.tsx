import Link from "next/link";
import { Logo } from "./Logo";

/** Simple paper page for non-map screens. */
export function PageShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh">
      <div className="paper-grain fixed" aria-hidden />
      <header className="mx-auto flex max-w-xl items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
        <Link href="/" aria-label="Voltar ao mapa" className="flex min-h-11 items-center">
          <Logo />
        </Link>
        <Link href="/" className="flex min-h-11 items-center text-sm font-bold text-mare underline-offset-4 hover:underline">
          Mapa
        </Link>
      </header>
      <main className="mx-auto max-w-xl px-4 pb-16">
        <h1 className="mt-4 mb-6 font-serif text-3xl font-bold">{title}</h1>
        {children}
      </main>
    </div>
  );
}
