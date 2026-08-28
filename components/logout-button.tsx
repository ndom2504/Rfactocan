"use client";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.assign("/login");
  }

  return (
    <Button variant="outline" size="sm" onClick={logout}>
      Déconnexion
    </Button>
  );
}
