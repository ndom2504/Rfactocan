import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  Text,
} from "react-native";
import { Button, Card, ErrorText, Field, Muted, Screen, Title } from "@/components/ui";
import { api } from "@/lib/api";
import {
  fetchPhoneCountries,
  type PhoneCountry,
} from "@/lib/phone-countries";
import { colors } from "@/lib/theme";

type InMe = {
  ready?: boolean;
  phoneMasked?: string | null;
  displayName?: string | null;
};

type InMatch = {
  userId: string;
  displayName?: string | null;
  threadId?: string | null;
  online?: boolean;
};

export default function InScreen() {
  const router = useRouter();
  const [me, setMe] = useState<InMe | null>(null);
  const [countries, setCountries] = useState<PhoneCountry[]>([]);
  const [country, setCountry] = useState<PhoneCountry | null>(null);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [lookup, setLookup] = useState("");
  const [matches, setMatches] = useState<InMatch[]>([]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadMe = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api<InMe>("/api/in/me");
      setMe(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadMe();
      fetchPhoneCountries()
        .then((list) => {
          setCountries(list);
          setCountry((c) => c ?? list.find((x) => x.code === "GA") ?? list[0] ?? null);
        })
        .catch(() => {});
    }, [loadMe])
  );

  async function sendCode() {
    if (!country) return;
    setBusy(true);
    setError("");
    try {
      const data = await api<{ mfaToken: string }>("/api/auth/phone/request", {
        method: "POST",
        body: JSON.stringify({ phone, country: country.code }),
      });
      setMfaToken(data.mfaToken);
      setInfo("Un code a été envoyé par SMS.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d’envoyer le SMS.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmCode() {
    if (!mfaToken) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/in/phone/link", {
        method: "POST",
        body: JSON.stringify({ mfaToken, code: otp.trim() }),
      });
      setMfaToken(null);
      setOtp("");
      await loadMe();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Code incorrect.");
    } finally {
      setBusy(false);
    }
  }

  async function search() {
    const value = lookup.trim();
    if (!value) return;
    setBusy(true);
    setError("");
    try {
      const data = await api<{ matches: InMatch[] }>("/api/in/match", {
        method: "POST",
        body: JSON.stringify({ phones: [value] }),
      });
      setMatches(data.matches ?? []);
      if (!(data.matches ?? []).length) setInfo("Personne n’est encore sur In avec ce numéro.");
      else setInfo("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recherche impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function openChat(match: InMatch) {
    setBusy(true);
    setError("");
    try {
      const threadId =
        match.threadId ||
        (
          await api<{ thread: { id: string } }>("/api/dm", {
            method: "POST",
            body: JSON.stringify({ toUserId: match.userId, contextType: "IN" }),
          })
        ).thread.id;
      router.push(`/messages/${threadId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversation impossible.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Title>In</Title>
        <Muted>Le réseau des opportunités — chat avec vos proches déjà sur Rfacto.</Muted>
        <ErrorText>{error}</ErrorText>
        {!!info && !error ? (
          <Text style={{ color: colors.accent, marginVertical: 8 }}>{info}</Text>
        ) : null}

        {!me?.ready ? (
          <Card>
            <Text style={{ fontWeight: "700", marginBottom: 8 }}>Activer In</Text>
            <Muted>Un numéro vérifié par SMS suffit.</Muted>
            <Field
              label="Pays (code, ex. GA, CA, SN)"
              autoCapitalize="characters"
              value={country?.code ?? "GA"}
              onChangeText={(code) => {
                const found = countries.find(
                  (c) => c.code === code.trim().toUpperCase()
                );
                if (found) setCountry(found);
              }}
            />
            {!mfaToken ? (
              <>
                <Field
                  label="Numéro"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder={country?.placeholder || "07 00 00 00"}
                />
                <Button label="Recevoir le code" onPress={sendCode} loading={busy} />
              </>
            ) : (
              <>
                <Field
                  label="Code SMS"
                  keyboardType="number-pad"
                  value={otp}
                  onChangeText={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                />
                <Button label="Activer In" onPress={confirmCode} loading={busy} />
              </>
            )}
          </Card>
        ) : (
          <>
            <Card>
              <Muted>Numéro In : {me.phoneMasked}</Muted>
              <Button
                label="Inviter via WhatsApp / Messages"
                variant="outline"
                onPress={() =>
                  void Share.share({
                    message:
                      "Rejoins-moi sur In — le réseau des opportunités. https://www.rfacto.com/share/in",
                  })
                }
              />
            </Card>
            <Card>
              <Text style={{ fontWeight: "700", marginBottom: 8 }}>Retrouver un contact</Text>
              <Field
                label="Numéro"
                keyboardType="phone-pad"
                value={lookup}
                onChangeText={setLookup}
                placeholder="07 00 00 00"
              />
              <Button label="Chercher sur In" onPress={search} loading={busy} />
              {matches.map((m) => (
                <Pressable
                  key={m.userId}
                  onPress={() => void openChat(m)}
                  style={{ paddingVertical: 10 }}
                >
                  <Text style={{ fontWeight: "600", color: colors.foreground }}>
                    {m.displayName || "Membre In"}
                    {m.online ? " · en ligne" : ""}
                  </Text>
                  <Muted>Ouvrir la conversation</Muted>
                </Pressable>
              ))}
            </Card>
            <Button
              label="Voir les messages"
              variant="outline"
              onPress={() => router.push("/(tabs)/messages")}
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
