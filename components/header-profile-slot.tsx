"use client";

import { usePathname } from "next/navigation";
import { ProfileMenu } from "@/components/profile-menu";

type Props = {
  userId?: string;
  displayName: string;
  avatarUrl?: string | null;
};

/** Keeps profile in the header on all app pages except the dashboard (banner owns it). */
export function HeaderProfileSlot({ userId, displayName, avatarUrl }: Props) {
  const pathname = usePathname();
  if (pathname === "/dashboard") return null;

  return (
    <div data-tour="profile-menu">
      <ProfileMenu userId={userId} displayName={displayName} avatarUrl={avatarUrl} size="sm" />
    </div>
  );
}
