import { type Href, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Chip, ChipRow } from "@/components/chip";
import { Button, Card, ErrorText, Field, Muted, Screen, Title } from "@/components/ui";
import { api, getApiUrl, getToken, uploadFile } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate, formatMoneyFromCents } from "@/lib/format";
import { useI18n, type DictKey } from "@/lib/i18n";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";

type AdminStats = {
  users?: number;
  trips?: number;
  requests?: number;
  openReports?: number;
  openDisputes?: number;
  kycVerified?: number;
  pendingOffers?: number;
  shopsOpen?: number;
  delivered?: number;
  inUsers?: number;
  paymentsCaptured?: number;
  platformFeesCadCents?: number;
  services?: number;
  servicesOpen?: number;
};

type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  kycStatus?: string;
  isAmbassador?: boolean;
  agentCode?: string | null;
  ambassadorRequestStatus?: string;
  ambassadorWhatsapp?: string | null;
  phone?: string | null;
  createdAt: string;
  hasManualIdDoc?: boolean;
  _count?: { referrals?: number };
};

type HeraldRequest = {
  id: string;
  email: string;
  displayName: string;
  ambassadorWhatsapp?: string | null;
  ambassadorRequestedAt?: string | null;
  kycStatus?: string;
};

type OpenDispute = {
  id: string;
  reason: string;
  details?: string | null;
  status: string;
  createdAt: string;
  openedBy: { displayName: string; email: string };
  againstUser: { id: string; displayName: string; email: string };
  booking: {
    id: string;
    status: string;
    request: { fromCity: string; toCity: string };
  };
};

type ManualId = {
  id: string;
  email: string;
  displayName: string;
  kycStatus?: string;
  manualIdDocUploadedAt?: string | null;
};

type Withdrawal = {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  channel: string;
  destinationHint: string;
  createdAt: string;
  user: { id: string; email: string; displayName: string };
};

type OpenReport = {
  id: string;
  reason: string;
  details?: string | null;
  createdAt: string;
  reporter: { displayName: string; email: string };
  targetUser: { id: string; displayName: string; email: string };
};

type AdminPayload = {
  stats?: AdminStats;
  users?: AdminUser[];
  pendingAmbassadorRequests?: HeraldRequest[];
  pendingManualIds?: ManualId[];
  pendingWalletWithdrawals?: Withdrawal[];
  openDisputes?: OpenDispute[];
  openReports?: OpenReport[];
};

type UserAction =
  | "verify"
  | "suspend"
  | "activate"
  | "mark_kyc_verified"
  | "reject_manual_id"
  | "promote_ambassador"
  | "reject_ambassador_request";

const DISPUTE_REASON: Record<string, DictKey> = {
  DAMAGE: "dispute_reason_damage",
  MISSING: "dispute_reason_missing",
  DELAY: "dispute_reason_delay",
  PAYMENT: "dispute_reason_payment",
  BEHAVIOR: "dispute_reason_behavior",
  CUSTOMS: "dispute_reason_customs",
  OTHER: "dispute_reason_other",
};

function ActionBtn({
  label,
  onPress,
  danger,
  disabled,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  const colors = useOptionalTheme()?.colors ?? lightColors;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: danger ? colors.danger : colors.border,
        backgroundColor: colors.surface2,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: danger ? colors.danger : colors.foreground,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  const colors = useOptionalTheme()?.colors ?? lightColors;
  return (
    <View
      style={{
        width: "48%",
        backgroundColor: colors.surface2,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
      }}
    >
      <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "800" }}>
        {value}
      </Text>
    </View>
  );
}

export default function AdminScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const [data, setData] = useState<AdminPayload | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastEmail, setBroadcastEmail] = useState(true);
  const [broadcastInbox, setBroadcastInbox] = useState(true);
  const [broadcastFile, setBroadcastFile] = useState<{
    url: string;
    name: string;
  } | null>(null);

  const isAdmin = user?.role === "ADMIN";

  const load = useCallback(
    async (q?: string) => {
      setError("");
      try {
        const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
        const [next, wa] = await Promise.all([
          api<AdminPayload>(`/api/admin${qs}`),
          api<{ url?: string }>("/api/admin/whatsapp-community").catch(
            () => ({ url: "" })
          ),
        ]);
        setData(next);
        if (typeof wa.url === "string") setWhatsappUrl(wa.url);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("retry"));
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  useFocusEffect(
    useCallback(() => {
      if (!isAdmin) {
        setLoading(false);
        return;
      }
      void load();
    }, [isAdmin, load])
  );

  async function patchUser(userId: string, action: UserAction) {
    setBusy(`${action}:${userId}`);
    setError("");
    try {
      await api("/api/admin", {
        method: "PATCH",
        body: JSON.stringify({ action, userId }),
      });
      await load(query);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusy(null);
    }
  }

  function confirmUser(userId: string, action: UserAction, title: string) {
    Alert.alert(title, undefined, [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("admin_confirm"),
        style: action === "suspend" || action === "reject_ambassador_request" || action === "reject_manual_id"
          ? "destructive"
          : "default",
        onPress: () => void patchUser(userId, action),
      },
    ]);
  }

  async function patchDispute(disputeId: string, status: "IN_REVIEW" | "RESOLVED" | "CLOSED") {
    setBusy(`dispute:${disputeId}:${status}`);
    setError("");
    try {
      await api("/api/disputes", {
        method: "PATCH",
        body: JSON.stringify({ disputeId, status }),
      });
      await load(query);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusy(null);
    }
  }

  async function markWithdrawal(withdrawalId: string, mark: "SENT" | "FAILED" | "CANCELLED") {
    setBusy(`wd:${withdrawalId}:${mark}`);
    setError("");
    try {
      await api("/api/admin", {
        method: "PATCH",
        body: JSON.stringify({
          action: "complete_wallet_withdrawal",
          withdrawalId,
          mark,
        }),
      });
      await load(query);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusy(null);
    }
  }

  async function saveWhatsapp() {
    setBusy("whatsapp");
    setError("");
    setInfo("");
    try {
      const data = await api<{ url?: string }>("/api/admin/whatsapp-community", {
        method: "PUT",
        body: JSON.stringify({ url: whatsappUrl.trim() }),
      });
      setWhatsappUrl(typeof data.url === "string" ? data.url : whatsappUrl.trim());
      setInfo(t("admin_whatsapp_ok"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusy(null);
    }
  }

  async function exportEmailsCsv() {
    setBusy("csv");
    setError("");
    setInfo("");
    try {
      const token = await getToken();
      const res = await fetch(`${getApiUrl()}/api/admin/users-emails-csv`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const csv = await res.text();
      if (!res.ok) {
        throw new Error(t("retry"));
      }
      await Share.share({
        title: "rfacto-users-emails.csv",
        message: csv,
      });
      setInfo(t("admin_csv_ok"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusy(null);
    }
  }

  async function sendPlayInvite() {
    setBusy("play");
    setError("");
    setInfo("");
    try {
      const data = await api<{
        total?: number;
        sent?: number;
        failed?: number;
      }>("/api/admin/play-test-invite", {
        method: "POST",
        body: JSON.stringify({ confirm: true }),
      });
      setInfo(
        t("admin_play_ok")
          .replace("{total}", String(data.total ?? 0))
          .replace("{sent}", String(data.sent ?? 0))
          .replace("{failed}", String(data.failed ?? 0))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusy(null);
    }
  }

  async function attachBroadcast() {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"],
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets?.[0]) return;
    const file = picked.assets[0];
    setBusy("attach");
    setError("");
    try {
      const uploaded = await uploadFile("/api/admin/broadcast/upload", {
        uri: file.uri,
        name: file.name || `piece-${Date.now()}`,
        type: file.mimeType || "application/octet-stream",
      });
      setBroadcastFile({
        url: uploaded.url,
        name: uploaded.name || file.name || "fichier",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusy(null);
    }
  }

  async function sendBroadcast() {
    if (!broadcastSubject.trim() || !broadcastBody.trim()) {
      setError(t("admin_broadcast_need_fields"));
      return;
    }
    if (!broadcastEmail && !broadcastInbox) {
      setError(t("admin_broadcast_need_channel"));
      return;
    }
    setBusy("broadcast");
    setError("");
    setInfo("");
    try {
      const data = await api<{
        total?: number;
        emailSent?: number;
        emailFailed?: number;
        inboxSent?: number;
        inboxFailed?: number;
      }>("/api/admin/broadcast", {
        method: "POST",
        body: JSON.stringify({
          confirm: true,
          subject: broadcastSubject.trim(),
          body: broadcastBody.trim(),
          sendEmail: broadcastEmail,
          sendInbox: broadcastInbox,
          attachmentUrl: broadcastFile?.url ?? null,
          attachmentName: broadcastFile?.name ?? null,
        }),
      });
      setInfo(
        t("admin_broadcast_ok")
          .replace("{total}", String(data.total ?? 0))
          .replace("{emailOk}", String(data.emailSent ?? 0))
          .replace("{emailFail}", String(data.emailFailed ?? 0))
          .replace("{inboxOk}", String(data.inboxSent ?? 0))
          .replace("{inboxFail}", String(data.inboxFailed ?? 0))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusy(null);
    }
  }

  async function resolveReport(reportId: string) {
    setBusy(`report:${reportId}`);
    setError("");
    try {
      await api("/api/reports", {
        method: "PATCH",
        body: JSON.stringify({ reportId, resolved: true }),
      });
      await load(query);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusy(null);
    }
  }

  if (!isAdmin) {
    return (
      <Screen>
        <Title>{t("admin_title")}</Title>
        <Muted>{t("admin_forbidden")}</Muted>
      </Screen>
    );
  }

  const stats = data?.stats ?? {};
  const users = data?.users ?? [];
  const heralds = data?.pendingAmbassadorRequests ?? [];
  const disputes = data?.openDisputes ?? [];
  const manuals = data?.pendingManualIds ?? [];
  const withdrawals = data?.pendingWalletWithdrawals ?? [];
  const reports = data?.openReports ?? [];

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Title>{t("admin_title")}</Title>
        <Muted>{t("admin_subtitle")}</Muted>
        <ErrorText>{error}</ErrorText>
        {info ? (
          <Text style={{ color: colors.foreground, marginBottom: 8 }}>{info}</Text>
        ) : null}
        {loading ? <Muted>{t("loading")}</Muted> : null}

        <Card>
          <Text style={{ fontWeight: "800", color: colors.foreground, marginBottom: 6 }}>
            {t("admin_whatsapp_title")}
          </Text>
          <Muted>{t("admin_whatsapp_hint")}</Muted>
          <Field
            label={t("admin_whatsapp_placeholder")}
            value={whatsappUrl}
            onChangeText={setWhatsappUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
          <Button
            label={t("admin_whatsapp_save")}
            onPress={() => void saveWhatsapp()}
            loading={busy === "whatsapp"}
            disabled={busy !== null}
          />
        </Card>

        <Card>
          <Text style={{ fontWeight: "800", color: colors.foreground, marginBottom: 6 }}>
            {t("admin_broadcast_title")}
          </Text>
          <Muted>{t("admin_broadcast_hint")}</Muted>
          <Field
            label={t("admin_broadcast_subject")}
            value={broadcastSubject}
            onChangeText={setBroadcastSubject}
          />
          <Field
            label={t("admin_broadcast_body")}
            value={broadcastBody}
            onChangeText={setBroadcastBody}
            multiline
          />
          <ChipRow>
            <Chip
              label={t("admin_broadcast_email")}
              selected={broadcastEmail}
              onPress={() => setBroadcastEmail((v) => !v)}
            />
            <Chip
              label={t("admin_broadcast_inbox")}
              selected={broadcastInbox}
              onPress={() => setBroadcastInbox((v) => !v)}
            />
          </ChipRow>
          <Button
            label={
              broadcastFile
                ? broadcastFile.name
                : t("admin_broadcast_attach")
            }
            variant="outline"
            onPress={() => void attachBroadcast()}
            loading={busy === "attach"}
            disabled={busy !== null}
          />
          {broadcastFile ? (
            <Pressable onPress={() => setBroadcastFile(null)} style={{ marginBottom: 8 }}>
              <Text style={{ color: colors.danger, fontWeight: "700" }}>
                {t("remove_photo")}
              </Text>
            </Pressable>
          ) : null}
          <Button
            label={t("admin_broadcast_send")}
            onPress={() =>
              Alert.alert(t("admin_broadcast_title"), t("admin_broadcast_confirm"), [
                { text: t("cancel"), style: "cancel" },
                {
                  text: t("admin_confirm"),
                  onPress: () => void sendBroadcast(),
                },
              ])
            }
            loading={busy === "broadcast"}
            disabled={busy !== null}
          />
        </Card>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          <View style={{ flex: 1, minWidth: 140 }}>
            <Button
              label={t("admin_csv_emails")}
              variant="outline"
              onPress={() => void exportEmailsCsv()}
              loading={busy === "csv"}
              disabled={busy !== null}
            />
          </View>
          <View style={{ flex: 1, minWidth: 140 }}>
            <Button
              label={t("admin_play_invite")}
              variant="outline"
              onPress={() =>
                Alert.alert(t("admin_play_invite"), t("admin_play_confirm"), [
                  { text: t("cancel"), style: "cancel" },
                  {
                    text: t("admin_confirm"),
                    onPress: () => void sendPlayInvite(),
                  },
                ])
              }
              loading={busy === "play"}
              disabled={busy !== null}
            />
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            marginTop: 12,
          }}
        >
          <Kpi label={t("admin_kpi_users")} value={stats.users ?? "—"} />
          <Kpi label={t("admin_kpi_in")} value={stats.inUsers ?? "—"} />
          <Kpi label={t("admin_kpi_kyc")} value={stats.kycVerified ?? "—"} />
          <Kpi label={t("admin_kpi_disputes")} value={stats.openDisputes ?? "—"} />
          <Kpi label={t("admin_kpi_reports")} value={stats.openReports ?? "—"} />
          <Kpi label={t("admin_kpi_trips")} value={stats.trips ?? "—"} />
          <Kpi label={t("admin_kpi_requests")} value={stats.requests ?? "—"} />
          <Kpi label={t("admin_kpi_delivered")} value={stats.delivered ?? "—"} />
          <Kpi label={t("admin_kpi_payments")} value={stats.paymentsCaptured ?? "—"} />
          <Kpi
            label={t("admin_kpi_fees")}
            value={
              stats.platformFeesCadCents != null
                ? formatMoneyFromCents(stats.platformFeesCadCents, "CAD")
                : "—"
            }
          />
          <Kpi label={t("admin_kpi_services")} value={stats.services ?? "—"} />
          <Kpi label={t("admin_kpi_shops")} value={stats.shopsOpen ?? "—"} />
        </View>

        <Text style={{ fontWeight: "800", color: colors.foreground, marginTop: 16, marginBottom: 8 }}>
          {t("admin_heralds_title")} ({heralds.length})
        </Text>
        {heralds.length === 0 ? <Muted>{t("admin_empty")}</Muted> : null}
        {heralds.map((row) => (
          <Card key={row.id}>
            <Text style={{ fontWeight: "700", color: colors.foreground }}>
              {row.displayName}
            </Text>
            <Muted>{row.email}</Muted>
            {row.ambassadorWhatsapp ? (
              <Pressable
                onPress={() =>
                  void Linking.openURL(
                    `https://wa.me/${row.ambassadorWhatsapp!.replace(/\D/g, "")}`
                  )
                }
              >
                <Text style={{ color: colors.foreground, fontWeight: "700", marginTop: 4 }}>
                  WhatsApp {row.ambassadorWhatsapp}
                </Text>
              </Pressable>
            ) : null}
            {row.ambassadorRequestedAt ? (
              <Muted>{formatDate(row.ambassadorRequestedAt)}</Muted>
            ) : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              <ActionBtn
                label={t("admin_promote_herald")}
                disabled={busy !== null}
                onPress={() =>
                  confirmUser(row.id, "promote_ambassador", t("admin_promote_herald"))
                }
              />
              <ActionBtn
                label={t("admin_reject_herald")}
                danger
                disabled={busy !== null}
                onPress={() =>
                  confirmUser(
                    row.id,
                    "reject_ambassador_request",
                    t("admin_reject_herald")
                  )
                }
              />
            </View>
          </Card>
        ))}

        <Text style={{ fontWeight: "800", color: colors.foreground, marginTop: 8, marginBottom: 8 }}>
          {t("admin_disputes_title")} ({disputes.length})
        </Text>
        {disputes.length === 0 ? <Muted>{t("admin_empty")}</Muted> : null}
        {disputes.map((row) => (
          <Card key={row.id}>
            <Text style={{ fontWeight: "700", color: colors.foreground }}>
              {t(DISPUTE_REASON[row.reason] ?? "dispute_reason_other")} · {row.status}
            </Text>
            <Muted>
              {row.openedBy.displayName} → {row.againstUser.displayName}
            </Muted>
            <Muted>
              {row.booking.request.fromCity} → {row.booking.request.toCity}
            </Muted>
            {row.details ? <Muted>{row.details}</Muted> : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              <ActionBtn
                label={t("admin_open_booking")}
                onPress={() => router.push(`/booking/${row.booking.id}` as Href)}
              />
              {row.status === "OPEN" ? (
                <ActionBtn
                  label={t("dispute_status_in_review")}
                  disabled={busy !== null}
                  onPress={() => void patchDispute(row.id, "IN_REVIEW")}
                />
              ) : null}
              <ActionBtn
                label={t("dispute_status_resolved")}
                disabled={busy !== null}
                onPress={() => void patchDispute(row.id, "RESOLVED")}
              />
              <ActionBtn
                label={t("dispute_status_closed")}
                danger
                disabled={busy !== null}
                onPress={() => void patchDispute(row.id, "CLOSED")}
              />
            </View>
          </Card>
        ))}

        <Text style={{ fontWeight: "800", color: colors.foreground, marginTop: 8, marginBottom: 8 }}>
          {t("admin_manual_id_title")} ({manuals.length})
        </Text>
        {manuals.length === 0 ? <Muted>{t("admin_empty")}</Muted> : null}
        {manuals.map((row) => (
          <Card key={row.id}>
            <Text style={{ fontWeight: "700", color: colors.foreground }}>
              {row.displayName}
            </Text>
            <Muted>{row.email}</Muted>
            {row.manualIdDocUploadedAt ? (
              <Muted>{formatDate(row.manualIdDocUploadedAt)}</Muted>
            ) : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              <ActionBtn
                label={t("admin_approve_kyc")}
                disabled={busy !== null}
                onPress={() =>
                  confirmUser(row.id, "mark_kyc_verified", t("admin_approve_kyc"))
                }
              />
              <ActionBtn
                label={t("admin_reject_id")}
                danger
                disabled={busy !== null}
                onPress={() =>
                  confirmUser(row.id, "reject_manual_id", t("admin_reject_id"))
                }
              />
            </View>
          </Card>
        ))}

        <Text style={{ fontWeight: "800", color: colors.foreground, marginTop: 8, marginBottom: 8 }}>
          {t("admin_withdrawals_title")} ({withdrawals.length})
        </Text>
        {withdrawals.length === 0 ? <Muted>{t("admin_empty")}</Muted> : null}
        {withdrawals.map((row) => (
          <Card key={row.id}>
            <Text style={{ fontWeight: "700", color: colors.foreground }}>
              {formatMoneyFromCents(row.amountCents, row.currency)} · {row.status}
            </Text>
            <Muted>
              {row.user.displayName} · {row.channel} · {row.destinationHint}
            </Muted>
            <Muted>{formatDate(row.createdAt)}</Muted>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              <ActionBtn
                label={t("admin_wd_sent")}
                disabled={busy !== null}
                onPress={() =>
                  Alert.alert(t("admin_wd_sent"), undefined, [
                    { text: t("cancel"), style: "cancel" },
                    {
                      text: t("admin_confirm"),
                      onPress: () => void markWithdrawal(row.id, "SENT"),
                    },
                  ])
                }
              />
              <ActionBtn
                label={t("admin_wd_failed")}
                danger
                disabled={busy !== null}
                onPress={() => void markWithdrawal(row.id, "FAILED")}
              />
              <ActionBtn
                label={t("admin_wd_cancel")}
                danger
                disabled={busy !== null}
                onPress={() => void markWithdrawal(row.id, "CANCELLED")}
              />
            </View>
          </Card>
        ))}

        <Text style={{ fontWeight: "800", color: colors.foreground, marginTop: 8, marginBottom: 8 }}>
          {t("admin_reports_title")} ({reports.length})
        </Text>
        {reports.length === 0 ? <Muted>{t("admin_empty")}</Muted> : null}
        {reports.map((row) => (
          <Card key={row.id}>
            <Text style={{ fontWeight: "700", color: colors.foreground }}>
              {row.reason}
            </Text>
            <Muted>
              {row.reporter.displayName} → {row.targetUser.displayName}
            </Muted>
            {row.details ? <Muted>{row.details}</Muted> : null}
            <View style={{ marginTop: 10 }}>
              <ActionBtn
                label={t("admin_report_resolve")}
                disabled={busy !== null}
                onPress={() => void resolveReport(row.id)}
              />
            </View>
          </Card>
        ))}

        <Text style={{ fontWeight: "800", color: colors.foreground, marginTop: 8, marginBottom: 8 }}>
          {t("admin_users_title")}
        </Text>
        <Field
          label={t("admin_search")}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={() => void load(query)}
        />
        <Button
          label={t("search")}
          onPress={() => void load(query)}
          loading={loading && busy === null}
        />
        {users.map((row) => (
          <Card key={row.id}>
            <Text style={{ fontWeight: "700", color: colors.foreground }}>
              {row.displayName}
            </Text>
            <Muted>{row.email}</Muted>
            <Muted>
              {row.status} · KYC {row.kycStatus ?? "—"}
              {row.isAmbassador ? ` · ${t("admin_herald_badge")}` : ""}
              {row.agentCode ? ` · ${row.agentCode}` : ""}
            </Muted>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {row.status === "SUSPENDED" ? (
                <ActionBtn
                  label={t("admin_activate")}
                  disabled={busy !== null}
                  onPress={() => void patchUser(row.id, "activate")}
                />
              ) : (
                <ActionBtn
                  label={t("admin_suspend")}
                  danger
                  disabled={busy !== null}
                  onPress={() => confirmUser(row.id, "suspend", t("admin_suspend"))}
                />
              )}
              {row.kycStatus !== "VERIFIED" ? (
                <ActionBtn
                  label={t("admin_approve_kyc")}
                  disabled={busy !== null}
                  onPress={() =>
                    confirmUser(row.id, "mark_kyc_verified", t("admin_approve_kyc"))
                  }
                />
              ) : null}
              {!row.isAmbassador ? (
                <ActionBtn
                  label={t("admin_promote_herald")}
                  disabled={busy !== null}
                  onPress={() =>
                    confirmUser(row.id, "promote_ambassador", t("admin_promote_herald"))
                  }
                />
              ) : null}
            </View>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
