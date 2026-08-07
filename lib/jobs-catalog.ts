/**
 * Job matching — secteurs et niveaux d'expérience (Commander Emploi).
 */

export const JOB_SECTORS = [
  { id: "tech", labelFr: "Tech / IT / Digital", labelEn: "Tech / IT / Digital" },
  { id: "commerce", labelFr: "Commerce & vente", labelEn: "Sales & retail" },
  { id: "logistics", labelFr: "Logistique & transport", labelEn: "Logistics & transport" },
  { id: "admin", labelFr: "Admin & bureau", labelEn: "Admin & office" },
  { id: "health", labelFr: "Santé & bien-être", labelEn: "Health & wellness" },
  { id: "hospitality", labelFr: "Hôtellerie & restauration", labelEn: "Hospitality & F&B" },
  { id: "construction", labelFr: "BTP & artisanat", labelEn: "Construction & trades" },
  { id: "education", labelFr: "Éducation & formation", labelEn: "Education & training" },
  { id: "finance", labelFr: "Finance & comptabilité", labelEn: "Finance & accounting" },
  { id: "marketing", labelFr: "Marketing & communication", labelEn: "Marketing & communication" },
  { id: "other", labelFr: "Autre", labelEn: "Other" },
] as const;

export type JobSectorId = (typeof JOB_SECTORS)[number]["id"];

export const JOB_EXPERIENCE_LEVELS = [
  { id: "junior", labelFr: "Débutant (0–2 ans)", labelEn: "Junior (0–2 years)" },
  { id: "mid", labelFr: "Intermédiaire (2–5 ans)", labelEn: "Mid (2–5 years)" },
  { id: "senior", labelFr: "Confirmé (5–10 ans)", labelEn: "Senior (5–10 years)" },
  { id: "expert", labelFr: "Expert (10+ ans)", labelEn: "Expert (10+ years)" },
] as const;

export type JobExperienceId = (typeof JOB_EXPERIENCE_LEVELS)[number]["id"];

export function isJobSectorId(value: string): value is JobSectorId {
  return JOB_SECTORS.some((s) => s.id === value);
}

export function isJobExperienceId(value: string): value is JobExperienceId {
  return JOB_EXPERIENCE_LEVELS.some((s) => s.id === value);
}

export function jobSectorLabel(
  id: string | null | undefined,
  locale: "fr" | "en"
): string {
  const s = JOB_SECTORS.find((x) => x.id === id);
  if (!s) return id || "—";
  return locale === "en" ? s.labelEn : s.labelFr;
}

export function jobExperienceLabel(
  id: string | null | undefined,
  locale: "fr" | "en"
): string {
  const s = JOB_EXPERIENCE_LEVELS.find((x) => x.id === id);
  if (!s) return id || "—";
  return locale === "en" ? s.labelEn : s.labelFr;
}

export function isJobNeedType(
  needType: string | null | undefined
): needType is "JOB_SEEK" | "JOB_OFFER" {
  return needType === "JOB_SEEK" || needType === "JOB_OFFER";
}
