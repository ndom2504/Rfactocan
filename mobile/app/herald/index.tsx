import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, Share, Text, View } from "react-native";
import {
  Button,
  Card,
  ErrorText,
  Field,
  Muted,
  Screen,
  Title,
} from "@/components/ui";
import { api, getApiUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatMoneyFromCents } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { colors } from "@/lib/theme";

type ApplyState = {
  isAmbassador: boolean;
  agentCode: string | null;
  ambassadorRequestStatus: string;
  ambassadorWhatsapp: string | null;
};

type HeraldKpis = {
  referralCount: number;
  referralsKycVerified: number;
  networkPaymentsCount: number;
  networkVolumeCents: number;
  accruedRewardCents: number;
  paidRewardCents: number;
  estimatedRewardCents: number;
  rewardBps: number;
  currency: string;
};

type Commission = {
  id: string;
  sourceType: string;
  rewardCents: number;
  currency: string;
  status: string;
  referral?: { displayName?: string | null } | null;
};

export default function HeraldScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<ApplyState | null>(null);
  const [kpis, setKpis] = useState<HeraldKpis | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const apply = await api<{ request: ApplyState }>("/api/ambassador/apply");
      setState(apply.request);
      if (apply.request.ambassadorWhatsapp) {
        setWhatsapp(apply.request.ambassadorWhatsapp);
      }
      if (apply.request.isAmbassador && apply.request.agentCode) {
        const stats = await api<{
          kpis?: HeraldKpis;
          recentCommissions?: Commission[];
        }>("/api/ambassador/stats");
        setKpis(stats.kpis ?? null);
        setCommissions(stats.recentCommissions ?? []);
      } else {
        setKpis(null);
        setCommissions([]);
      }
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

  async function submit() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data = await api<{ request: ApplyState }>("/api/ambassador/apply", {
        method: "POST",
        body: JSON.stringify({ whatsapp }),
      });
      setState(data.request);
      setMessage(t("ambassador_apply_sent"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusy(false);
    }
  }

  async function shareInvite() {
    const code = state?.agentCode;
    if (!code) return;
    const url = `${getApiUrl()}/register?ref=${encodeURIComponent(code)}`;
    const who = user?.displayName || "Rfacto";
    try {
      await Share.share({
        message: t("invite_contacts_message")
          .replace("{who}", who)
          .replace("{url}", url),
      });
    } catch {
      /* cancelled */
    }
  }

  async function withdraw() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data = await api<{ mode?: string; error?: string }>(
        "/api/wallet/withdraw",
        { method: "POST", body: JSON.stringify({}) }
      );
      setMessage(
        data.mode === "stripe"
          ? t("wallet_withdraw_ok_stripe")
          : t("wallet_withdraw_ok_manual")
      );
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("wallet_withdraw_need_link")
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading && !state) {
    return (
      <Screen>
        <Muted>{t("loading")}</Muted>
      </Screen>
    );
  }

  const isHerald = Boolean(state?.isAmbassador && state.agentCode);
  const pending = state?.ambassadorRequestStatus === "PENDING";
  const rejected = state?.ambassadorRequestStatus === "REJECTED";
  const rewardPct = kpis ? String(Math.round(kpis.rewardBps / 100)) : "—";
  const currency = kpis?.currency || "CAD";
  const canWithdraw = (kpis?.accruedRewardCents ?? 0) > 0;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Muted>{t("ambassador_badge")}</Muted>
        <Title>
          {isHerald ? t("ambassador_earn_title") : t("ambassador_apply_title")}
        </Title>
        <Muted>
          {isHerald
            ? t("ambassador_earn_lead").replace(
                "{name}",
                user?.displayName || ""
              )
            : t("ambassador_apply_lead")}
        </Muted>
        <ErrorText>{error}</ErrorText>
        {message ? (
          <Text style={{ color: colors.foreground, marginTop: 8 }}>{message}</Text>
        ) : null}

        {isHerald ? (
          <>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 12,
              }}
            >
              <Kpi
                label={t("ambassador_kpi_referrals")}
                value={String(kpis?.referralCount ?? "…")}
              />
              <Kpi
                label={t("ambassador_kpi_kyc")}
                value={String(kpis?.referralsKycVerified ?? "…")}
              />
              <Kpi
                label={t("ambassador_kpi_accrued")}
                value={
                  kpis
                    ? formatMoneyFromCents(kpis.accruedRewardCents, currency)
                    : "…"
                }
              />
              <Kpi
                label={t("ambassador_kpi_paid")}
                value={
                  kpis
                    ? formatMoneyFromCents(kpis.paidRewardCents, currency)
                    : "…"
                }
              />
              <Kpi
                label={t("ambassador_kpi_volume")}
                value={
                  kpis
                    ? formatMoneyFromCents(kpis.networkVolumeCents, currency)
                    : "…"
                }
                hint={
                  kpis
                    ? `${kpis.networkPaymentsCount} ${t("ambassador_kpi_payments")}`
                    : undefined
                }
              />
              <Kpi
                label={t("ambassador_kpi_estimate")}
                value={
                  kpis
                    ? formatMoneyFromCents(kpis.estimatedRewardCents, currency)
                    : "…"
                }
                hint={t("ambassador_kpi_estimate_hint").replace(
                  "{pct}",
                  rewardPct
                )}
              />
            </View>

            <Card>
              <Muted>{t("ambassador_code_label")}</Muted>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "800",
                  letterSpacing: 2,
                  color: colors.foreground,
                  marginTop: 4,
                }}
              >
                {state?.agentCode}
              </Text>
              <Muted>
                {getApiUrl()}/register?ref={state?.agentCode}
              </Muted>
              <Button
                label={t("ambassador_copy_link")}
                onPress={() => void shareInvite()}
              />
            </Card>

            <Muted>1. {t("ambassador_earn_step1")}</Muted>
            <Muted>2. {t("ambassador_earn_step2")}</Muted>
            <Muted>3. {t("ambassador_earn_step3")}</Muted>
            <Muted>
              4. {t("ambassador_earn_step4").replace("{pct}", rewardPct)}
            </Muted>
            <Muted>{t("ambassador_earn_note")}</Muted>

            <Button
              label={t("wallet_withdraw")}
              onPress={() => void withdraw()}
              loading={busy}
              disabled={!canWithdraw}
            />
            <Button
              label={t("nav_profile")}
              variant="outline"
              onPress={() => router.push("/(tabs)/profile")}
            />

            {commissions.slice(0, 8).map((c) => (
              <Card key={c.id}>
                <Text style={{ fontWeight: "700", color: colors.foreground }}>
                  {formatMoneyFromCents(c.rewardCents, c.currency || currency)}
                </Text>
                <Muted>
                  {c.sourceType}
                  {c.referral?.displayName ? ` · ${c.referral.displayName}` : ""}
                  {` · ${c.status}`}
                </Muted>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Muted>1. {t("ambassador_apply_step1")}</Muted>
            <Muted>2. {t("ambassador_apply_step2")}</Muted>
            <Muted>3. {t("ambassador_apply_step3")}</Muted>
            <Muted>4. {t("ambassador_apply_step4")}</Muted>

            {pending ? (
              <Card>
                <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                  {t("ambassador_apply_pending")}
                </Text>
                {state?.ambassadorWhatsapp ? (
                  <Muted>WhatsApp : {state.ambassadorWhatsapp}</Muted>
                ) : null}
              </Card>
            ) : (
              <>
                {rejected ? (
                  <Muted>{t("ambassador_apply_rejected")}</Muted>
                ) : null}
                <Field
                  label={t("ambassador_apply_whatsapp")}
                  keyboardType="phone-pad"
                  value={whatsapp}
                  onChangeText={setWhatsapp}
                  placeholder="+241 06 00 00 00"
                />
                <Muted>{t("ambassador_apply_whatsapp_hint")}</Muted>
                <Button
                  label={t("ambassador_apply_submit")}
                  onPress={() => void submit()}
                  loading={busy}
                  disabled={!whatsapp.trim()}
                />
              </>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <View style={{ width: "47%", minWidth: 140 }}>
      <Card>
        <Muted>{label}</Muted>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "800",
            color: colors.foreground,
            marginTop: 4,
          }}
        >
          {value}
        </Text>
        {hint ? <Muted>{hint}</Muted> : null}
      </Card>
    </View>
  );
}
