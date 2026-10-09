import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DemoLogin } from "@/components/ui/DemoLogin";
import { PageShell } from "@/components/ui/PageShell";
import { card } from "@/components/ui/styles";
import { getUser, safeNext } from "@/lib/auth";
import { demoLoginEnabled } from "@/lib/demoAccounts";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Entrar · SoloRota" };

type Props = { searchParams: Promise<{ next?: string; erro?: string }> };

export default async function SignInPage({ searchParams }: Props) {
  const { next, erro } = await searchParams;
  const dest = safeNext(next, "/perfil");
  // Guests browsing with an anonymous session can still sign in here.
  const user = await getUser();
  if (user && !user.is_anonymous) redirect(dest);

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
      {demoLoginEnabled() && (
        <div className={`${card} mt-6 p-5`}>
          <DemoLogin next={dest} />
        </div>
      )}
    </PageShell>
  );
}
