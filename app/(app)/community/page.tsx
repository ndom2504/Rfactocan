import { CommunityFeed } from "@/components/community-feed";
import { getRequestLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";

export default async function CommunityPage() {
  const locale = await getRequestLocale();

  return (
    <div className="space-y-6" data-tour="community">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
        {t(locale, "community_title")}
      </h1>
      <CommunityFeed />
    </div>
  );
}
