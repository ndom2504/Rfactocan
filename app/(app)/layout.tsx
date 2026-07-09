import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { Badge } from "@/components/ui/badge";

const links = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/trips", label: "Voyages" },
  { href: "/requests", label: "Demandes" },
  { href: "/bookings", label: "Réservations" },
  { href: "/messages", label: "Messages" },
  { href: "/profile", label: "Profil" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="font-[family-name:var(--font-display)] text-xl font-semibold"
            >
              Rfacto
            </Link>
            <nav className="hidden gap-4 md:flex">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  {l.label}
                </Link>
              ))}
              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="text-sm font-medium text-[var(--highlight)]"
                >
                  Admin
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {user.verifiedAt && (
              <Badge className="bg-[var(--accent-soft)] text-[var(--accent)]">
                Vérifié
              </Badge>
            )}
            <Link href="/profile" className="flex items-center gap-2">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover border border-[var(--border)]"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs font-medium">
                  {user.displayName.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="text-sm">{user.displayName}</span>
            </Link>
            <LogoutButton />
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-3 overflow-x-auto px-6 pb-3 md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="whitespace-nowrap text-sm text-[var(--muted)]"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
