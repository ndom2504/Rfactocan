import { getSessionUser } from "@/lib/auth";
import { getRequestLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import { InHome } from "@/components/in-home";

export default async function InPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const locale = await getRequestLocale();

  return (
    <InHome
      displayName={user.displayName}
      avatarUrl={user.avatarUrl}
      agentCode={user.agentCode ?? null}
      title={t(locale, "nav_in")}
      tagline={t(locale, "in_tagline")}
    />
  );
}
