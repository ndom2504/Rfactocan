import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-2xl font-semibold"
        >
          Rfacto
        </Link>
      </header>
      {children}
    </div>
  );
}
