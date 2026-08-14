"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { attachmentFromImageUrl } from "@/lib/community";

type Props = {
  kind: "service" | "shop";
  title: string;
  description?: string | null;
  city?: string | null;
  country?: string | null;
  href: string;
  coverUrl?: string | null;
  disabled?: boolean;
};

function absoluteHref(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).toString();
}

export function ShareProjectToCommunityButton({
  kind,
  title,
  description,
  city,
  country,
  href,
  coverUrl,
  disabled,
}: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function share() {
    if (busy || done || disabled) return;
    setBusy(true);
    setError("");
    const place = [city, country].filter(Boolean).join(", ");
    const lead =
      kind === "shop"
        ? t("my_projects_share_shop_lead")
        : t("my_projects_share_service_lead");
    const desc = (description || "").trim().slice(0, 1200);
    const link = absoluteHref(href);
    const body = [
      `${lead} ${title.trim()}`,
      place,
      desc,
      `${t("my_projects_share_see")} ${link}`,
    ]
      .filter((line) => line && String(line).trim())
      .join("\n\n");

    const cover = attachmentFromImageUrl(coverUrl, title);
    try {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "BUSINESS",
          title: title.trim().slice(0, 120),
          body: body.length >= 10 ? body : `${lead} ${title} — ${link}`,
          attachments: cover ? [cover] : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t("my_projects_share_error"));
      }
      setDone(true);
      const postId = data.post?.id as string | undefined;
      if (postId) router.push(`/community/${postId}`);
      else router.push("/community");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("my_projects_share_error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={busy || done || disabled}
        onClick={() => void share()}
      >
        {busy
          ? t("loading")
          : done
            ? t("my_projects_share_ok")
            : t("my_projects_share_community")}
      </Button>
      {error && <p className="max-w-[10rem] text-xs text-red-700">{error}</p>}
    </div>
  );
}
