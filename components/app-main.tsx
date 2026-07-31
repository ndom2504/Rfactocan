"use client";

import { usePathname } from "next/navigation";

export function AppMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard";

  if (isDashboard) {
    return <main className="w-full">{children}</main>;
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
  );
}
