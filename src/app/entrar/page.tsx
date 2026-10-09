import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/ui/PageShell";
import { card } from "@/components/ui/styles";
import { getUser, safeNext } from "@/lib/auth";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Entrar · SoloRota" };

type Props = { searchParams: Promise<{ next?: string; erro?: string }> };

export default async function SignInPage({ searchParams }: Props) {
  const { next, erro } = await searchParams;
  const dest = safeNext(next, "/perfil");
  if (await getUser()) redirect(dest);

  return (
    <PageShell title="Entrar">
      <div className={`${card} p-5`}>
        {erro === "link" && (
          <p role="alert" className="mb-4 text-sm text-danger">
            O link expirou ou já foi usado. Peça um novo abaixo.
          </p>
        )}
        <SignInForm next={dest} />
      </div>
    </PageShell>
  );
}
