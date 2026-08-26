import { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { Button, ErrorText, Field } from "@/components/ui";
import { colors } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import {
  fetchPhoneCountries,
  type PhoneCountry,
} from "@/lib/phone-countries";

type Props = {
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  onLoggedIn: () => void;
};

export function PhoneOtpAuth({
  displayName,
  onDisplayNameChange,
  onLoggedIn,
}: Props) {
  const { requestPhoneOtp, verifyPhoneOtp, resendPhoneOtp } = useAuth();
  const [countries, setCountries] = useState<PhoneCountry[]>([]);
  const [country, setCountry] = useState<PhoneCountry | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [phoneHint, setPhoneHint] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    fetchPhoneCountries()
      .then((list) => {
        setCountries(list);
        setCountry((current) => current ?? list.find((c) => c.code === "GA") ?? list[0] ?? null);
      })
      .catch(() => {});
  }, []);

  async function sendCode() {
    if (!country) return;
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const data = await requestPhoneOtp(phone, country.code);
      setMfaToken(data.mfaToken);
      setPhoneHint(data.phoneHint);
      setIsNew(data.isNew);
      setInfo("Un code a été envoyé par SMS.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d’envoyer le SMS.");
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    if (!mfaToken) return;
    if (isNew && displayName.trim().length < 2) {
      setError("Indiquez votre nom pour créer le compte.");
      return;
    }
    setLoading(true);
    setError("");
    setInfo("");
    try {
      await verifyPhoneOtp(mfaToken, otpCode.trim(), displayName.trim() || undefined);
      onLoggedIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Code incorrect.");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (!mfaToken) return;
    setResendLoading(true);
    setError("");
    try {
      const data = await resendPhoneOtp(mfaToken);
      if (data.mfaToken) setMfaToken(data.mfaToken);
      if (data.phoneHint) setPhoneHint(data.phoneHint);
      setInfo("Un nouveau code a été envoyé.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de renvoyer le code.");
    } finally {
      setResendLoading(false);
    }
  }

  if (mfaToken) {
    return (
      <View>
        <Text style={{ color: colors.muted, marginBottom: 12 }}>
          Entrez le code à 6 chiffres envoyé au {phoneHint || "numéro"}.
        </Text>
        {isNew ? (
          <Field
            label="Nom affiché"
            value={displayName}
            onChangeText={onDisplayNameChange}
            placeholder="Amina N."
          />
        ) : null}
        <Field
          label="Code SMS"
          keyboardType="number-pad"
          value={otpCode}
          onChangeText={(v) => setOtpCode(v.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          maxLength={6}
        />
        {!!info && !error ? (
          <Text style={{ color: colors.accent, marginBottom: 8 }}>{info}</Text>
        ) : null}
        <ErrorText>{error}</ErrorText>
        <Button label="Valider le code" onPress={verify} loading={loading} />
        <Button
          label="Renvoyer le code"
          onPress={resend}
          loading={resendLoading}
          variant="outline"
        />
        <Pressable
          onPress={() => {
            setMfaToken(null);
            setOtpCode("");
            setInfo("");
            setError("");
          }}
          style={{ marginTop: 16 }}
        >
          <Text style={{ color: colors.muted, textAlign: "center" }}>
            Retour
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <Text style={{ color: colors.muted, marginBottom: 12 }}>
        Un code SMS suffit. Email et mot de passe restent disponibles.
      </Text>
      <Pressable
        onPress={() => setPickerOpen(true)}
        style={{
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground, marginBottom: 4 }}>
          Pays du numéro
        </Text>
        <Text style={{ fontSize: 16, color: colors.foreground }}>
          {country ? `${country.name} (${country.dial})` : "Choisir…"}
        </Text>
      </Pressable>
      <Field
        label="Numéro"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        placeholder={country?.placeholder || "07 00 00 00"}
      />
      {!!info && !error ? (
        <Text style={{ color: colors.accent, marginBottom: 8 }}>{info}</Text>
      ) : null}
      <ErrorText>{error}</ErrorText>
      <Button label="Recevoir le code SMS" onPress={sendCode} loading={loading} />

      <Modal visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 48 }}>
          <Pressable onPress={() => setPickerOpen(false)} style={{ padding: 16 }}>
            <Text style={{ color: colors.accent, fontWeight: "600" }}>Fermer</Text>
          </Pressable>
          <FlatList
            data={countries}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setCountry(item);
                  setPickerOpen(false);
                }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <Text style={{ color: colors.foreground, fontSize: 16 }}>
                  {item.name} {item.dial}
                </Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}
