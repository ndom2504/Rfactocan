import { cn } from "@/lib/utils";

type Props = {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Show green online indicator */
  online?: boolean;
};

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-20 w-20 text-xl",
};

const dots = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
  xl: "h-3.5 w-3.5",
};

export function UserAvatar({
  name,
  avatarUrl,
  size = "md",
  className,
  online,
}: Props) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <div className={cn("relative shrink-0", className)}>
      <div
        className={cn(
          "overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-2)]",
          sizes[size]
        )}
        title={name}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-medium text-[var(--accent)]">
            {initial}
          </div>
        )}
      </div>
      {online != null && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-2 border-[var(--surface)]",
            dots[size],
            online ? "bg-emerald-500" : "bg-zinc-400"
          )}
          title={online ? "En ligne" : "Hors ligne"}
          aria-hidden
        />
      )}
    </div>
  );
}
