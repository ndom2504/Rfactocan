"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

type MeetKind = "BUSINESS" | "ROMANCE";
type MeetGender = "MALE" | "FEMALE" | "OTHER" | "UNSPECIFIED";

type ProfileForm = {
  kind: MeetKind;
  headline: string;
  bio: string;
  myGender: MeetGender;
  birthYear: string;
  city: string;
  country: string;
  seekGender: MeetGender;
  ageMin: string;
  ageMax: string;
  interests: string;
  photoUrl: string | null;
  photoVisible: boolean;
  active: boolean;
};

const emptyForm = (): ProfileForm => ({
  kind: "BUSINESS",
  headline: "",
  bio: "",
  myGender: "UNSPECIFIED",
  birthYear: "",
  city: "",
  country: "",
  seekGender: "UNSPECIFIED",
  ageMin: "",
  ageMax: "",
  interests: "",
  photoUrl: null,
  photoVisible: true,
  active: true,
});

export default function MeetProfilePage() {
  const { t } = useI18n();
  const router = useRouter();
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [incoming, setIncoming] = useState<
    Array<{
      id: string;
      message: string | null;
      fromUser: { id: string; displayName: string };
    }>
  >([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pRes, cRes] = await Promise.all([
          fetch("/api/meet/profile"),
          fetch("/api/meet/contact"),
        ]);
        const pData = await pRes.json();
        if (!cancelled && pRes.ok && pData.profile) {
          const p = pData.profile;
          setForm({
            kind: p.kind,
            headline: p.headline || "",
            bio: p.bio || "",
            myGender: p.myGender || "UNSPECIFIED",
            birthYear: p.birthYear ? String(p.birthYear) : "",
            city: p.city || "",
            country: p.country || "",
            seekGender: p.seekGender || "UNSPECIFIED",
            ageMin: p.ageMin != null ? String(p.ageMin) : "",
            ageMax: p.ageMax != null ? String(p.ageMax) : "",
            interests: p.interests || "",
            photoUrl: p.photoUrl,
            photoVisible: p.photoVisible !== false,
            active: p.active !== false,
          });
        }
        const cData = await cRes.json();
        if (!cancelled && cRes.ok) {
          setIncoming(
            (cData.incoming ?? []).filter(
              (c: { status: string }) => c.status === "PENDING"
            )
          );
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function setField<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function onPhoto(files: FileList | null) {
    if (!files?.[0]) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", files[0]);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload impossible");
      setField("photoUrl", data.url as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur upload");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      if (form.headline.trim().length < 3) {
        throw new Error(t("meet_headline_required"));
      }
      const res = await fetch("/api/meet/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: form.kind,
          headline: form.headline.trim(),
          bio: form.bio.trim() || null,
          myGender: form.myGender,
          birthYear: form.birthYear ? Number(form.birthYear) : null,
          city: form.city.trim() || null,
          country: form.country.trim() || null,
          seekGender: form.seekGender,
          ageMin: form.ageMin ? Number(form.ageMin) : null,
          ageMax: form.ageMax ? Number(form.ageMax) : null,
          interests: form.interests.trim() || null,
          photoUrl: form.photoUrl,
          photoVisible: form.photoVisible,
          active: form.active,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setSaved(true);
      if (form.active) {
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function respond(id: string, action: "accept" | "decline") {
    const res = await fetch(`/api/meet/contact/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Erreur");
      return;
    }
    setIncoming((list) => list.filter((c) => c.id !== id));
    if (data.threadId) {
      router.push(`/messages/dm/${data.threadId}`);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-[var(--muted)]">{t("loading")}</p>
    );
  }

  const steps = [
    t("meet_step_type"),
    t("meet_step_you"),
    t("meet_step_criteria"),
    t("meet_step_photo"),
  ];

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          {t("meet_title")}
        </h1>
        <p className="mt-1 text-[var(--muted)]">{t("meet_subtitle")}</p>
      </div>

      {incoming.length > 0 && (
        <div className="space-y-2 border border-[var(--border)] p-4">
          <h2 className="font-semibold">{t("meet_incoming_title")}</h2>
          {incoming.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-2 first:border-0 first:pt-0"
            >
              <div className="min-w-0 text-sm">
                <Link
                  href={`/meet/${c.fromUser.id}`}
                  className="font-medium text-[var(--accent)] hover:underline"
                >
                  {c.fromUser.displayName}
                </Link>
                {c.message && (
                  <p className="line-clamp-2 text-[var(--muted)]">{c.message}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void respond(c.id, "accept")}
                >
                  {t("meet_accept")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void respond(c.id, "decline")}
                >
                  {t("meet_decline")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {steps.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium",
              step === i
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--surface-2)] text-[var(--muted)]"
            )}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">{t("meet_type_hint")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["BUSINESS", "meet_kind_business", "meet_kind_business_hint"],
                ["ROMANCE", "meet_kind_romance", "meet_kind_romance_hint"],
              ] as const
            ).map(([value, titleKey, hintKey]) => (
              <button
                key={value}
                type="button"
                onClick={() => setField("kind", value)}
                className={cn(
                  "border p-4 text-left transition",
                  form.kind === value
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--border)] hover:border-[var(--muted)]"
                )}
              >
                <p className="font-semibold">{t(titleKey)}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{t(hintKey)}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="headline">{t("meet_headline")}</Label>
            <Input
              id="headline"
              value={form.headline}
              onChange={(e) => setField("headline", e.target.value)}
              placeholder={t("meet_headline_ph")}
              maxLength={120}
            />
          </div>
          <div>
            <Label htmlFor="bio">{t("meet_bio")}</Label>
            <Textarea
              id="bio"
              value={form.bio}
              onChange={(e) => setField("bio", e.target.value)}
              rows={4}
              maxLength={800}
              placeholder={t("meet_bio_ph")}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="myGender">{t("meet_my_gender")}</Label>
              <select
                id="myGender"
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                value={form.myGender}
                onChange={(e) =>
                  setField("myGender", e.target.value as MeetGender)
                }
              >
                <option value="UNSPECIFIED">{t("meet_gender_any")}</option>
                <option value="MALE">{t("meet_gender_male")}</option>
                <option value="FEMALE">{t("meet_gender_female")}</option>
                <option value="OTHER">{t("meet_gender_other")}</option>
              </select>
            </div>
            <div>
              <Label htmlFor="birthYear">{t("meet_birth_year")}</Label>
              <Input
                id="birthYear"
                type="number"
                min={1920}
                max={new Date().getFullYear() - 16}
                value={form.birthYear}
                onChange={(e) => setField("birthYear", e.target.value)}
                placeholder="1990"
              />
            </div>
            <div>
              <Label htmlFor="city">{t("meet_city")}</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => setField("city", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="country">{t("meet_country")}</Label>
              <Input
                id="country"
                value={form.country}
                onChange={(e) => setField("country", e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">{t("meet_criteria_hint")}</p>
          <div>
            <Label htmlFor="seekGender">{t("meet_seek_gender")}</Label>
            <select
              id="seekGender"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              value={form.seekGender}
              onChange={(e) =>
                setField("seekGender", e.target.value as MeetGender)
              }
            >
              <option value="UNSPECIFIED">{t("meet_gender_any")}</option>
              <option value="MALE">{t("meet_gender_male")}</option>
              <option value="FEMALE">{t("meet_gender_female")}</option>
              <option value="OTHER">{t("meet_gender_other")}</option>
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="ageMin">{t("meet_age_min")}</Label>
              <Input
                id="ageMin"
                type="number"
                min={18}
                max={99}
                value={form.ageMin}
                onChange={(e) => setField("ageMin", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="ageMax">{t("meet_age_max")}</Label>
              <Input
                id="ageMax"
                type="number"
                min={18}
                max={99}
                value={form.ageMax}
                onChange={(e) => setField("ageMax", e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="interests">{t("meet_interests")}</Label>
            <Input
              id="interests"
              value={form.interests}
              onChange={(e) => setField("interests", e.target.value)}
              placeholder={t("meet_interests_ph")}
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="photo">{t("meet_photo")}</Label>
            <Input
              id="photo"
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => void onPhoto(e.target.files)}
            />
            {form.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.photoUrl}
                alt=""
                className={cn(
                  "mt-3 h-40 w-40 object-cover",
                  !form.photoVisible && "opacity-40"
                )}
              />
            )}
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.photoVisible}
              onChange={(e) => setField("photoVisible", e.target.checked)}
            />
            <span>
              <span className="font-medium">{t("meet_photo_visible")}</span>
              <span className="block text-[var(--muted)]">
                {t("meet_photo_visible_hint")}
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.active}
              onChange={(e) => setField("active", e.target.checked)}
            />
            <span>
              <span className="font-medium">{t("meet_active")}</span>
              <span className="block text-[var(--muted)]">
                {t("meet_active_hint")}
              </span>
            </span>
          </label>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="text-sm text-[var(--accent)]">{t("meet_saved")}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {step > 0 && (
          <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
            {t("meet_prev")}
          </Button>
        )}
        {step < steps.length - 1 ? (
          <Button type="button" onClick={() => setStep((s) => s + 1)}>
            {t("meet_next")}
          </Button>
        ) : (
          <Button type="button" disabled={saving || uploading} onClick={() => void save()}>
            {saving ? t("loading") : t("meet_save")}
          </Button>
        )}
        <Link href="/community?kind=MEET" className={buttonVariants({ variant: "outline" })}>
          {t("meet_see_matches")}
        </Link>
      </div>
    </div>
  );
}
