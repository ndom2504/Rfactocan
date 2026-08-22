import Link from "next/link";

type Props = {
  label: string;
  href?: string;
};

export function InFab({ label, href = "/in" }: Props) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#10241F] text-[#D4AF37] shadow-lg shadow-black/25 transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37] md:bottom-8 md:right-8"
    >
      <span className="font-[family-name:var(--font-display)] text-lg font-bold">
        In
      </span>
    </Link>
  );
}
