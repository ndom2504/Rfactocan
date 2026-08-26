import { type Href, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  Share,
  Text,
  View,
} from "react-native";
import { Button, Card, ErrorText, Field, Muted, Screen, Title } from "@/components/ui";
import { api, getApiUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  loadDeviceContacts,
  mergeContactsWithMatches,
  phonesForMatch,
  type InContactRow,
  type InMatch,
  type PhoneContact,
} from "@/lib/in-contacts";
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

type InChatThread = {
  id: string;
  lastMessage?: { body?: string | null; attachmentUrl?: string | null } | null;
  peer?: { displayName?: string | null } | null;
};

function inviteUrl() {
  return `${getApiUrl()}/share/in`;
}

function inviteMessage(name?: string | null) {
  const who = name?.trim();
  const signed = who
    ? `\n\n— ${who}`
    : "";
  return `Inscris-toi sur Rfacto et rejoins-moi sur In pour bâtir des relations et un réseau pro business.${signed}\n\nIn — le réseau des opportunités.\n${inviteUrl()}`;
}

function smsHref(phone: string, body: string) {
  const encoded = encodeURIComponent(body);
  const dest = phone.replace(/\s+/g, "");
  return Platform.OS === "ios"
    ? `sms:${dest}&body=${encoded}`
    : `sms:${dest}?body=${encoded}`;
}

export default function InScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [me, setMe] = useState<InMe | null>(null);
  const [countries, setCountries] = useState<PhoneCountry[]>([]);
  const [country, setCountry] = useState<PhoneCountry | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [lookup, setLookup] = useState("");
  const [lookupHits, setLookupHits] = useState<InMatch[]>([]);
  const [query, setQuery] = useState("");
  const [contacts, setContacts] = useState<PhoneContact[]>([]);
  const [matches, setMatches] = useState<InMatch[]>([]);
  const [inThreads, setInThreads] = useState<InChatThread[]>([]);
  const [contactsDenied, setContactsDenied] = useState(false);
  const [pane, setPane] = useState<"in" | "invite">("in");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);

  const loadMe = useCallback(async () => {
    setError("");
    try {
      const data = await api<InMe>("/api/in/me");
      setMe(data);
      if (data.ready) {
        const chats = await api<{ threads: InChatThread[] }>("/api/dm?scope=in");
        setInThreads(chats.threads ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  const matchDirectory = useCallback(async (list: PhoneContact[]) => {
    const phones = phonesForMatch(list);
    if (!phones.length) {
      setMatches([]);
      return;
    }
    const data = await api<{ matches: InMatch[] }>("/api/in/match", {
      method: "POST",
      body: JSON.stringify({ phones }),
    });
    setMatches(data.matches ?? []);
  }, []);

  const scanContacts = useCallback(async () => {
    setScanning(true);
    setError("");
    setInfo("");
    try {
      const result = await loadDeviceContacts();
      if (!result.ok) {
        setContactsDenied(true);
        setContacts([]);
        setMatches([]);
        setInfo("Autorisez l’accès au répertoire pour retrouver vos proches déjà sur In.");
        return;
      }
      setContactsDenied(false);
      setContacts(result.contacts);
      await matchDirectory(result.contacts);
      if (!result.contacts.length) {
        setInfo("Aucun numéro trouvé dans le répertoire.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lecture du carnet impossible.");
    } finally {
      setScanning(false);
    }
  }, [matchDirectory]);

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

  useFocusEffect(
    useCallback(() => {
      if (me?.ready) void scanContacts();
    }, [me?.ready, scanContacts])
  );

  const rows = useMemo(
    () => mergeContactsWithMatches(contacts, matches, query),
    [contacts, matches, query]
  );
  const onIn = useMemo(() => {
    const fromBook = rows
      .filter((row): row is InContactRow & { match: InMatch } => Boolean(row.match))
      .filter(
        (row, index, list) =>
          list.findIndex((x) => x.match.userId === row.match.userId) === index
      );
    const extras = lookupHits
      .filter((hit) => !fromBook.some((row) => row.match.userId === hit.userId))
      .filter((hit) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (
          (hit.displayName || "").toLowerCase().includes(q) ||
          (hit.phone || "").toLowerCase().includes(q)
        );
      })
      .map((hit) => ({
        id: `lookup-${hit.userId}`,
        name: hit.displayName || "Membre In",
        phone: hit.phone || lookup,
        match: hit,
      }));
    return [...extras, ...fromBook];
  }, [rows, lookupHits, query, lookup]);
  const invitees = useMemo(
    () => rows.filter((row) => !row.match).slice(0, 80),
    [rows]
  );
  const listData = pane === "in" ? onIn : invitees;

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
        body: JSON.stringify({ phones: [value.slice(0, 32)] }),
      });
      const found = data.matches ?? [];
      setLookupHits(found);
      setPane("in");
      if (!found.length) setInfo("Personne n’est encore sur In avec ce numéro.");
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
      router.push(`/messages/${threadId}` as Href);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversation impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function shareInvite() {
    try {
      await Share.share({ message: inviteMessage(me?.displayName || user?.displayName) });
    } catch {
      /* dismissed */
    }
  }

  async function smsInvite(row: InContactRow) {
    const message = inviteMessage(me?.displayName || user?.displayName);
    const href = smsHref(row.phone, message);
    try {
      const can = await Linking.canOpenURL(href);
      if (can) {
        await Linking.openURL(href);
        return;
      }
    } catch {
      /* fall through */
    }
    await Share.share({ message });
  }

  function renderRow({ item }: { item: InContactRow }) {
    if (item.match) {
      return (
        <Pressable
          onPress={() => void openChat(item.match!)}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 12,
            marginBottom: 8,
          }}
        >
          <Text style={{ fontWeight: "700", color: colors.foreground }}>
            {item.match.displayName || item.name}
            {item.match.online ? " · en ligne" : ""}
          </Text>
          <Muted>{item.match.online ? "Ouvrir la conversation" : item.phone}</Muted>
        </Pressable>
      );
    }
    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 12,
          marginBottom: 8,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "600", color: colors.foreground }}>{item.name}</Text>
          <Muted>{item.phone}</Muted>
        </View>
        <Pressable onPress={() => void smsInvite(item)} style={{ padding: 6 }}>
          <Text style={{ color: colors.accent, fontWeight: "700" }}>SMS</Text>
        </Pressable>
        <Pressable onPress={() => void shareInvite()} style={{ padding: 6 }}>
          <Text style={{ color: colors.accent, fontWeight: "700" }}>Partager</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
      </Screen>
    );
  }

  if (!me?.ready) {
    return (
      <Screen>
        <Title>In</Title>
        <Muted>Le réseau des opportunités — chat avec vos proches déjà sur Rfacto.</Muted>
        <ErrorText>{error}</ErrorText>
        {!!info && !error ? (
          <Text style={{ color: colors.accent, marginVertical: 8 }}>{info}</Text>
        ) : null}
        <Card>
          <Text style={{ fontWeight: "700", marginBottom: 8 }}>Activer In</Text>
          <Muted>Un numéro vérifié par SMS suffit.</Muted>
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
              marginTop: 12,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: colors.foreground,
                marginBottom: 4,
              }}
            >
              Pays du numéro
            </Text>
            <Text style={{ fontSize: 16, color: colors.foreground }}>
              {country
                ? `${country.name} (${country.dial})`
                : "Choisir…"}
            </Text>
          </Pressable>
          {!mfaToken ? (
            <>
              <Field
                label="Numéro"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                placeholder={country?.placeholder || "077 00 00 00"}
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
        <Modal
          visible={pickerOpen}
          animationType="slide"
          onRequestClose={() => setPickerOpen(false)}
        >
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
      </Screen>
    );
  }

  return (
    <Screen style={{ paddingBottom: 0 }}>
      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <Title>In</Title>
            <Muted>Le réseau des opportunités — chat avec vos proches déjà sur Rfacto.</Muted>
            <ErrorText>{error}</ErrorText>
            {!!info && !error ? (
              <Text style={{ color: colors.accent, marginVertical: 8 }}>{info}</Text>
            ) : null}
            <Card>
              <Muted>Numéro In : {me.phoneMasked}</Muted>
              <Muted>
                Le répertoire reste sur votre téléphone. Rfacto n’importe pas vos contacts.
              </Muted>
              <Button
                label={scanning ? "Lecture du carnet…" : "Lire le carnet"}
                onPress={() => void scanContacts()}
                loading={scanning}
              />
              {contactsDenied ? (
                <Button
                  label="Ouvrir les paramètres"
                  variant="outline"
                  onPress={() => void Linking.openSettings()}
                />
              ) : null}
              <Button
                label="Inviter via WhatsApp / Messages"
                variant="outline"
                onPress={() => void shareInvite()}
              />
            </Card>
            <Card>
              <Text style={{ fontWeight: "700", marginBottom: 8 }}>Retrouver un contact</Text>
              <Field
                label="Filtrer le carnet"
                value={query}
                onChangeText={setQuery}
                placeholder="Nom ou numéro"
              />
              <Field
                label="Numéro (recherche manuelle)"
                keyboardType="phone-pad"
                value={lookup}
                onChangeText={setLookup}
                placeholder="077 00 00 00"
              />
              <Button label="Chercher ce numéro" onPress={search} loading={busy} />
            </Card>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              <Pressable
                onPress={() => setPane("in")}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: pane === "in" ? colors.accent : colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontWeight: "700",
                    color: pane === "in" ? "#fff" : colors.foreground,
                  }}
                >
                  Sur In ({onIn.length})
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setPane("invite")}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: pane === "invite" ? colors.accent : colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontWeight: "700",
                    color: pane === "invite" ? "#fff" : colors.foreground,
                  }}
                >
                  Inviter ({invitees.length})
                </Text>
              </Pressable>
            </View>
            {pane === "in" && inThreads.length > 0 ? (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontWeight: "700", color: colors.foreground, marginBottom: 8 }}>
                  Discussions In
                </Text>
                {inThreads.map((th) => (
                  <Pressable
                    key={th.id}
                    onPress={() => router.push(`/messages/${th.id}` as Href)}
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: colors.border,
                      padding: 12,
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ fontWeight: "700", color: colors.foreground }}>
                      {th.peer?.displayName || "Contact In"}
                    </Text>
                    <Muted>
                      {th.lastMessage?.body?.trim() ||
                        (th.lastMessage?.attachmentUrl ? "Pièce jointe" : "Ouvrir")}
                    </Muted>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          scanning ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 16 }} />
          ) : (
            <Muted>
              {pane === "in"
                ? "Personne de votre carnet n’est encore sur In. Invitez-les, ou cherchez un numéro."
                : "Tous vos contacts avec un numéro sont déjà sur In, ou le carnet n’a pas encore été lu."}
            </Muted>
          )
        }
        renderItem={renderRow}
      />
    </Screen>
  );
}
