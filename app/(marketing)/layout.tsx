import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
          Rfacto
        </Link>
        <nav className="flex items-center gap-3">
          {user ? (
            <Link href="/dashboard">
              <Button>Tableau de bord</Button>
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]">
                Connexion
              </Link>
              <Link href="/register">
                <Button>Créer un compte</Button>
              </Link>
            </>
          )}
        </nav>
      </header>
      {children}
    </div>
  );
}
