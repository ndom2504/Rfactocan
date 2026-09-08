import { type Href, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, ScrollView, Text } from "react-native";
import { Badge, Button, Card, ErrorText, Muted, Screen, Title } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { shopCategoryLabel } from "@/lib/shops-catalog";
import { colors } from "@/lib/theme";

type ServiceRow = {
  id: string;
  title: string;
  city?: string;
  country?: string;
  status: string;
};

type ShopRow = {
  id: string;
  name: string;
  city?: string;
  country?: string;
  category?: string;
  status: string;
  _count?: { products?: number };
};

export default function MyProjectsScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const [svc, shop] = await Promise.all([
        api<{ listings?: ServiceRow[] }>("/api/services?mine=1"),
        api<{ shops?: ShopRow[] }>("/api/shops?mine=1"),
      ]);
      setServices(svc.listings ?? []);
      setShops(shop.shops ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function deleteService(id: string) {
    setBusyId(id);
    setError("");
    try {
      await api(`/api/services/${id}`, { method: "DELETE" });
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusyId(null);
    }
  }

  async function deleteShop(id: string) {
    setBusyId(id);
    setError("");
    try {
      await api(`/api/shops/${id}`, { method: "DELETE" });
      setShops((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusyId(null);
    }
  }

  const empty = !loading && services.length === 0 && shops.length === 0;

  return (
    <Screen>
      <ScrollView>
        <Title>{t("my_projects_title")}</Title>
        <Muted>{t("my_projects_subtitle")}</Muted>
        <Button
          label={t("shops_create_title")}
          onPress={() => router.push("/shops/new" as Href)}
        />
        <Button
          label={t("publish_listing_cta")}
          variant="outline"
          onPress={() => router.push("/service/new")}
        />
        <ErrorText>{error}</ErrorText>
        {loading ? <Muted>{t("loading")}</Muted> : null}
        {empty ? (
          <Card>
            <Text style={{ fontWeight: "700", color: colors.foreground }}>
              {t("my_projects_empty_title")}
            </Text>
            <Muted>{t("my_projects_empty_hint")}</Muted>
          </Card>
        ) : null}

        {services.length ? <Title>{t("my_projects_services")}</Title> : null}
        {services.map((s) => (
          <Card key={s.id}>
            <Text style={{ fontWeight: "700", color: colors.foreground }}>
              {s.title}
            </Text>
            <Muted>
              {[s.city, s.country].filter(Boolean).join(", ") || "—"} · {s.status}
            </Muted>
            <Button
              label={t("edit")}
              variant="outline"
              onPress={() => router.push(`/service/${s.id}/edit` as Href)}
            />
            <Button
              label={t("my_projects_delete")}
              variant="danger"
              onPress={() =>
                Alert.alert(t("my_projects_delete"), t("my_projects_delete_service_confirm"), [
                  { text: t("cancel"), style: "cancel" },
                  {
                    text: t("my_projects_delete"),
                    style: "destructive",
                    onPress: () => void deleteService(s.id),
                  },
                ])
              }
              disabled={busyId === s.id}
            />
          </Card>
        ))}

        {shops.length ? <Title>{t("my_projects_shops")}</Title> : null}
        {shops.map((s) => (
          <Card key={s.id}>
            <Text style={{ fontWeight: "700", color: colors.foreground }}>
              {s.name}
            </Text>
            <Muted>
              {s.category ? `${shopCategoryLabel(s.category, locale)} · ` : ""}
              {[s.city, s.country].filter(Boolean).join(", ") || "—"} · {s.status}
              {s._count?.products ? ` · ${s._count.products}` : ""}
            </Muted>
            <Badge>{s.status}</Badge>
            <Button
              label={t("shops_manage")}
              onPress={() => router.push(`/shops/${s.id}/manage` as Href)}
            />
            <Button
              label={t("my_projects_delete")}
              variant="danger"
              onPress={() =>
                Alert.alert(t("my_projects_delete"), t("my_projects_delete_shop_confirm"), [
                  { text: t("cancel"), style: "cancel" },
                  {
                    text: t("my_projects_delete"),
                    style: "destructive",
                    onPress: () => void deleteShop(s.id),
                  },
                ])
              }
              disabled={busyId === s.id}
            />
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
