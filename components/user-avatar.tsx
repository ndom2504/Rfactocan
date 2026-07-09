import { cn } from "@/lib/utils";

type Props = {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

export function UserAvatar({ name, avatarUrl, size = "md", className }: Props) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-2)]",
        sizes[size],
        className
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
  );
}
