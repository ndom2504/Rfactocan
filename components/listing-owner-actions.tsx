"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/locale-provider";

type Props = {
  kind: "trip" | "request";
  id: string;
  editHref: string;
  className?: string;
};

export function ListingOwnerActions({ kind, id, editHref, className }: Props) {
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onDelete() {
    const ok = window.confirm(
      kind === "trip" ? t("delete_confirm_trip") : t("delete_confirm_request")
    );
    if (!ok) return;
    setBusy(true);
    setError("");
    const res = await fetch(
      kind === "trip" ? `/api/trips/${id}` : `/api/requests/${id}`,
      { method: "DELETE" }
    );
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(
        data.code === "ACTIVE_BOOKING"
          ? t("cannot_delete_active")
          : (data.error ?? "Erreur")
      );
      return;
    }
    router.push(kind === "trip" ? "/trips" : "/requests");
    router.refresh();
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        <Link href={editHref}>
          <Button variant="outline" size="sm" disabled={busy}>
            {t("edit")}
          </Button>
        </Link>
        <Button
          variant="danger"
          size="sm"
          disabled={busy}
          onClick={() => void onDelete()}
        >
          {busy ? t("loading") : t("delete")}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
