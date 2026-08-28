import { useEffect, useState } from "react";
import { Linking, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Chip, ChipRow } from "@/components/chip";
import { Button, ErrorText, Field } from "@/components/ui";
import { api, postMultipart } from "@/lib/api";
import { useI18n, type DictKey } from "@/lib/i18n";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";
import {
  loadUserIntent,
  saveUserIntent,
  type PayoutChannel,
  type PayoutProvider,
} from "@/lib/user-intent";

export type ProfileUser = {
  id: string;
  email?: string | null;
  phone?: string | null;
  displayName: string;
  bio?: string | null;
  country?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  role?: string;
  language?: string;
  preferredCurrency?: string;
  kycStatus?: string | null;
  kycRequired?: boolean;
  manualIdDocStatus?: string | null;
  manualIdDocNote?: string | null;
  stripeConnectChargesEnabled?: boolean;
  stripeConnectPayoutsEnabled?: boolean;
  publicationCharterAcceptedAt?: string | null;
  isAmbassador?: boolean;
  agentCode?: string | null;
  ratingAvg?: number;
  ratingCount?: number;
};

const PROVIDERS: { id: PayoutProvider; key: DictKey }[] = [
  { id: "mobile_money", key: "payout_mobile_money" },
  { id: "orange_money", key: "payout_orange" },
  { id: "moov_money", key: "payout_moov" },
  { id: "mtn_momo", key: "payout_mtn" },
  { id: "airtel_money", key: "payout_airtel" },
  { id: "mpesa_vodacom", key: "payout_mpesa" },
  { id: "interac", key: "payout_interac" },
];

function kycRequiredFor(user: ProfileUser) {
  const country = (user.country ?? "").trim().toUpperCase();
  if (user.kycRequired === false) return false;
  if (country === "GA" || country.includes("GABON")) return false;
  if (user.kycRequired === true) return true;
  return Boolean(country);
}

export function userPassesKyc(user: ProfileUser) {
  if (user.kycStatus === "VERIFIED" || user.manualIdDocStatus === "APPROVED") {
    return true;
  }
  return !kycRequiredFor(user);
}

function kycLabel(status?: string | null) {
  if (status === "VERIFIED") return "Vérifié";
  if (status === "PENDING") return "En cours";
  if (status === "REQUIRES_INPUT") return "Action requise";
  if (status === "FAILED") return "Échoué";
  return "Non démarré";
}

export function PaymentSetupCard({
  user,
  onUserUpdated,
}: {
  user: ProfileUser;
  onUserUpdated: (next: ProfileUser) => void;
}) {
  const { t } = useI18n();
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState<PayoutChannel>("mobile");
  const [provider, setProvider] = useState<PayoutProvider>("mobile_money");
  const [identifier, setIdentifier] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankHolder, setBankHolder] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankIban, setBankIban] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [docType, setDocType] = useState("insurance");

  useEffect(() => {
    void (async () => {
      const prefs = await loadUserIntent();
      setChannel(prefs.payoutChannel);
      setProvider(prefs.payoutProvider);
      setIdentifier(prefs.payoutIdentifier);
      setBankName(prefs.payoutBankName);
      setBankHolder(prefs.payoutBankHolder);
      setBankAccount(prefs.payoutBankAccount);
      setBankIban(prefs.payoutBankIban);
      try {
        const data = await api<{
          destination?: {
            payoutChannel?: PayoutChannel | null;
            payoutProvider?: PayoutProvider | null;
            payoutIdentifier?: string | null;
            payoutBankName?: string | null;
            payoutBankHolder?: string | null;
            payoutBankAccount?: string | null;
            payoutBankIban?: string | null;
          };
        }>("/api/wallet");
        const dest = data.destination;
        if (!dest) return;
        if (dest.payoutChannel) setChannel(dest.payoutChannel);
        if (dest.payoutProvider) setProvider(dest.payoutProvider);
        if (dest.payoutIdentifier) setIdentifier(dest.payoutIdentifier);
        if (dest.payoutBankName) setBankName(dest.payoutBankName);
        if (dest.payoutBankHolder) setBankHolder(dest.payoutBankHolder);
        if (dest.payoutBankAccount) setBankAccount(dest.payoutBankAccount);
        if (dest.payoutBankIban) setBankIban(dest.payoutBankIban);
      } catch {
        /* keep local */
      }
    })();
  }, [user.id]);

  const kycDone = userPassesKyc(user);
  const stripeDone = Boolean(
    user.stripeConnectChargesEnabled && user.stripeConnectPayoutsEnabled
  );
  const kycNeeded = kycRequiredFor(user);

  async function persistLocal() {
    await saveUserIntent({
      payoutChannel: channel,
      payoutProvider: provider,
      payoutIdentifier: identifier,
      payoutBankName: bankName,
      payoutBankHolder: bankHolder,
      payoutBankAccount: bankAccount,
      payoutBankIban: bankIban,
    });
  }

  async function saveWallet() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await persistLocal();
      await api("/api/wallet", {
        method: "PUT",
        body: JSON.stringify({
          payoutChannel: channel,
          payoutProvider: provider,
          payoutIdentifier: identifier || null,
          payoutBankName: bankName || null,
          payoutBankHolder: bankHolder || null,
          payoutBankAccount: bankAccount || null,
          payoutBankIban: bankIban || null,
        }),
      });
      setMessage(t("wallet_linked_ok"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("wallet_save_error"));
    } finally {
      setBusy(false);
    }
  }

  async function startKyc() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data = await api<{
        alreadyVerified?: boolean;
        url?: string;
        error?: string;
      }>("/api/kyc", { method: "POST" });
      if (data.alreadyVerified) {
        setMessage("Identité déjà vérifiée.");
        onUserUpdated({ ...user, kycStatus: "VERIFIED" });
        return;
      }
      if (data.url) {
        setMessage(t("stripe_open_hint"));
        await Linking.openURL(data.url);
        return;
      }
      setError(t("retry"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusy(false);
    }
  }

  async function startConnect() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data = await api<{ url?: string }>("/api/connect", { method: "POST" });
      if (data.url) {
        setMessage(t("stripe_open_hint"));
        await Linking.openURL(data.url);
        return;
      }
      setError(t("retry"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusy(false);
    }
  }

  async function refreshStripe() {
    setBusy(true);
    setError("");
    try {
      const [kyc, connect] = await Promise.all([
        api<{ user?: ProfileUser }>("/api/kyc"),
        api<{ user?: ProfileUser }>("/api/connect"),
      ]);
      onUserUpdated({
        ...user,
        ...kyc.user,
        ...connect.user,
      });
      setMessage(t("profile_saved"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusy(false);
    }
  }

  async function sendManualId() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
        copyToCacheDirectory: true,
      });
      if (picked.canceled) return;
      const asset = picked.assets[0];
      const typeLabel = t(
        `identity_doc_${docType}` as DictKey
      );
      const note = [`[${typeLabel}]`, manualNote.trim()].filter(Boolean).join(" ");
      const data = await postMultipart<{
        manualIdDocStatus?: string;
        kycStatus?: string;
      }>("/api/kyc/manual-id", {
        uri: asset.uri,
        name: asset.name || "id-doc.jpg",
        type: asset.mimeType || "image/jpeg",
      }, note ? { note } : undefined);
      onUserUpdated({
        ...user,
        manualIdDocStatus: data.manualIdDocStatus ?? "SUBMITTED",
        kycStatus: data.kycStatus ?? user.kycStatus,
      });
      setMessage(t("manual_id_sent"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("retry"));
    } finally {
      setBusy(false);
    }
  }

  const readyBg = kycDone ? colors.accentSoft : "#FFF3E0";
  const readyBorder = kycDone ? colors.accent : "#FFB74D";

  return (
    <View
      style={{
        backgroundColor: readyBg,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: readyBorder,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <Text style={{ fontWeight: "800", fontSize: 16, color: colors.foreground }}>
        {t("trust_payments")}
      </Text>
      <Text style={{ fontWeight: "700", fontSize: 16, marginTop: 4, color: colors.foreground }}>
        {t("wallet_title")}
      </Text>
      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4, marginBottom: 12 }}>
        {t("wallet_lead")}
      </Text>

      <View
        style={{
          borderWidth: 1,
          borderColor: colors.accent,
          borderRadius: 12,
          padding: 12,
          marginBottom: 12,
          backgroundColor: colors.surface,
        }}
      >
        <Text style={{ fontWeight: "800", fontSize: 15, color: colors.foreground, marginBottom: 6 }}>
          {t("identity_section_title")}
        </Text>
        <Text style={{ color: colors.foreground, marginBottom: 8 }}>
          {kycNeeded
            ? `Identité (KYC) : ${kycLabel(user.kycStatus)}`
            : `Identité : ${t("kyc_not_required")} · ${kycLabel(user.kycStatus)}`}
        </Text>
        {user.kycStatus === "VERIFIED" ? (
          <Text style={{ color: colors.accent, fontWeight: "700" }}>
            {t("verified")}
          </Text>
        ) : (
          <>
            <Button label={t("verify_identity")} onPress={() => void startKyc()} loading={busy} />
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>
              {t("identity_stripe_hint")}
            </Text>
          </>
        )}
      </View>
      {user.kycStatus !== "VERIFIED" ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontWeight: "700", color: colors.foreground }}>
            {t("manual_id_title")}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginVertical: 6 }}>
            {t("manual_id_lead")}
          </Text>
          {user.manualIdDocStatus === "SUBMITTED" ? (
            <Text style={{ color: colors.accent, marginBottom: 8 }}>{t("manual_id_sent")}</Text>
          ) : null}
          {user.manualIdDocStatus === "APPROVED" ? (
            <Text style={{ color: colors.accent, marginBottom: 8 }}>{t("manual_id_approved")}</Text>
          ) : null}
          {user.manualIdDocStatus === "REJECTED" ? (
            <Text style={{ color: colors.danger, marginBottom: 8 }}>{t("manual_id_rejected")}</Text>
          ) : null}
          <Text style={{ fontWeight: "700", marginBottom: 8, color: colors.foreground }}>
            {t("identity_doc_type")}
          </Text>
          <ChipRow>
            {(
              [
                ["insurance", "identity_doc_insurance"],
                ["health", "identity_doc_health"],
                ["passport", "identity_doc_passport"],
                ["license", "identity_doc_license"],
                ["id", "identity_doc_id"],
                ["other", "identity_doc_other"],
              ] as const
            ).map(([id, key]) => (
              <Chip
                key={id}
                label={t(key)}
                selected={docType === id}
                onPress={() => setDocType(id)}
              />
            ))}
          </ChipRow>
          <Field
            label={t("manual_id_note_label")}
            value={manualNote}
            onChangeText={setManualNote}
          />
          <Button
            label={t("manual_id_send")}
            variant="outline"
            onPress={() => void sendManualId()}
            loading={busy}
          />
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>
            {t("manual_id_hint")}
          </Text>
        </View>
      ) : null}

      {!stripeDone ? (
        <View style={{ marginBottom: 12 }}>
          <Button
            label={t("receive_earnings")}
            variant="outline"
            onPress={() => void startConnect()}
            loading={busy}
          />
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>
            {t("receive_earnings_hint")}
          </Text>
          <Button
            label={t("stripe_refresh")}
            variant="outline"
            onPress={() => void refreshStripe()}
            loading={busy}
          />
        </View>
      ) : (
        <Text style={{ color: colors.accent, marginBottom: 12 }}>{t("bank_ready")}</Text>
      )}

      <Text style={{ fontWeight: "700", marginBottom: 8, color: colors.foreground }}>
        {t("payout_channel")}
      </Text>
      <ChipRow>
        <Chip
          label={t("payout_mobile")}
          selected={channel === "mobile"}
          onPress={() => {
            setChannel("mobile");
            void persistLocal();
          }}
        />
        <Chip
          label={t("payout_bank")}
          selected={channel === "bank"}
          onPress={() => {
            setChannel("bank");
            void persistLocal();
          }}
        />
      </ChipRow>

      {channel === "mobile" ? (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: "700", marginBottom: 8, color: colors.foreground }}>
            {t("payout_provider")}
          </Text>
          <ChipRow>
            {PROVIDERS.map((item) => (
              <Chip
                key={item.id}
                label={t(item.key)}
                selected={provider === item.id}
                onPress={() => {
                  setProvider(item.id);
                  void persistLocal();
                }}
              />
            ))}
          </ChipRow>
          <Field
            label={t("payout_identifier")}
            value={identifier}
            onChangeText={setIdentifier}
          />
          <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>
            {t("payout_identifier_hint")}
          </Text>
        </View>
      ) : (
        <View style={{ marginTop: 12 }}>
          <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>
            {t("wallet_bank_manual_hint")}
          </Text>
          <Field
            label={t("wallet_bank_holder")}
            value={bankHolder}
            onChangeText={setBankHolder}
          />
          <Field label={t("wallet_bank_name")} value={bankName} onChangeText={setBankName} />
          <Field
            label={t("wallet_bank_account")}
            value={bankAccount}
            onChangeText={setBankAccount}
          />
          <Field label={t("wallet_bank_iban")} value={bankIban} onChangeText={setBankIban} />
          {stripeDone ? (
            <Text style={{ color: colors.accent, marginBottom: 8 }}>{t("bank_ready")}</Text>
          ) : (
            <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>
              {t("receive_earnings_hint")}
            </Text>
          )}
        </View>
      )}

      <Button label={t("wallet_save_link")} onPress={() => void saveWallet()} loading={busy} />

      <ErrorText>{error}</ErrorText>
      {message ? (
        <Text style={{ color: colors.accent, marginTop: 8 }}>{message}</Text>
      ) : null}
    </View>
  );
}
