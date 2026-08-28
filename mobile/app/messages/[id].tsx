import { requestRecordingPermissionsAsync } from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { type Href, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  Share,
  Text,
  View,
} from "react-native";
import { useCallActions } from "@/components/call-provider";
import { ChatComposer } from "@/components/chat-composer";
import { Chip, ChipRow } from "@/components/chip";
import {
  DmReactionChips,
  DmReactionPicker,
} from "@/components/dm-reaction-picker";
import { TypingBubble } from "@/components/typing-dots";
import { VoiceNoteBubble } from "@/components/voice-note-bubble";
import type { VoicePickedFile } from "@/components/voice-note-button";
import { Button, ErrorText, Field, Muted, Screen } from "@/components/ui";
import { api, isImageAttachment, mediaUrl, uploadFile } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { createOutgoingCall } from "@/lib/calls";
import {
  toggleReactionSummaries,
  type ReactionSummary,
} from "@/lib/dm-reactions";
import { formatMoneyFromCents } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import {
  isServicePaymentOpen,
  paymentIdFromMessage,
  servicePaymentStatusKey,
  stripServicePaymentLinks,
  type ServicePayment,
} from "@/lib/service-payments";
import { useOptionalTheme } from "@/lib/theme-context";
import { colors as lightColors } from "@/lib/theme";
import { isVoiceMessage, stopAllVoicePlayback } from "@/lib/voice";

const PROCESSING_DAYS = [1, 2, 3, 5, 7, 14, 30];

type Message = {
  id: string;
  body?: string | null;
  attachmentUrl?: string | null;
  senderId: string;
  createdAt: string;
  contextType?: string | null;
  contextId?: string | null;
  reactions?: ReactionSummary[];
};

type ForwardThread = {
  id: string;
  peer?: { displayName?: string | null; avatarUrl?: string | null };
};

function guessMime(name: string, mime?: string | null) {
  if (mime && mime !== "application/octet-stream") return mime;
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "pdf") return "application/pdf";
  if (ext === "mp4") return "video/mp4";
  if (ext === "mov") return "video/quicktime";
  return mime || "application/octet-stream";
}

function fileNameFromUri(uri: string, fallback: string) {
  try {
    const last = decodeURIComponent(uri.split("?")[0].split("/").pop() || "");
    return last && last.includes(".") ? last : fallback;
  } catch {
    return fallback;
  }
}

function isAttachmentOnlyBody(body?: string | null) {
  const text = (body || "").trim();
  return (
    !text ||
    text === "Pièce jointe" ||
    text === "Attachment" ||
    text === "📎" ||
    text === "Note vocale" ||
    text === "Voice note"
  );
}

export default function DirectChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const colors = useOptionalTheme()?.colors ?? lightColors;
  const { startOutgoing } = useCallActions();
  const listRef = useRef<FlatList<Message>>(null);
  const [peer, setPeer] = useState<string>("");
  const [peerId, setPeerId] = useState<string | null>(null);
  const [peerAvatar, setPeerAvatar] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [invoices, setInvoices] = useState<ServicePayment[]>([]);
  const [canInvoice, setCanInvoice] = useState(false);
  const [showPayForm, setShowPayForm] = useState(false);
  const [payTitle, setPayTitle] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payDescription, setPayDescription] = useState("");
  const [payDays, setPayDays] = useState(3);
  const [payBusy, setPayBusy] = useState(false);
  const [payOk, setPayOk] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [calling, setCalling] = useState(false);
  const [reactingToId, setReactingToId] = useState<string | null>(null);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [forwardThreads, setForwardThreads] = useState<ForwardThread[]>([]);
  const [forwardLoading, setForwardLoading] = useState(false);
  const [forwardBusy, setForwardBusy] = useState(false);
  const [peerOnline, setPeerOnline] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const typingOnRef = useRef(false);
  const typingPingAt = useRef(0);
  const typingIdle = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!id) return;
    if (!opts?.silent) setError("");
    try {
      const [data, payRes] = await Promise.all([
        api<{
          messages: Message[];
          canInvoice?: boolean;
          peerTyping?: boolean;
          peer?: {
            id?: string;
            displayName?: string | null;
            avatarUrl?: string | null;
            online?: boolean;
          };
        }>(`/api/dm/${id}/messages`),
        api<{ payments?: ServicePayment[] }>(
          `/api/service-payments?threadId=${encodeURIComponent(id)}`
        ).catch(() => ({ payments: [] as ServicePayment[] })),
      ]);
      setMessages(data.messages ?? []);
      setPeer(data.peer?.displayName || "Contact");
      setPeerId(data.peer?.id ?? null);
      setPeerAvatar(data.peer?.avatarUrl ?? null);
      setPeerOnline(data.peer?.online === true);
      setPeerTyping(data.peerTyping === true);
      setCanInvoice(data.canInvoice === true);
      setInvoices(payRes.payments ?? []);
      if (opts?.silent) setError("");
    } catch (e) {
      if (!opts?.silent) {
        setError(e instanceof Error ? e.message : "Erreur");
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load({ silent: true }), 4000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    return () => {
      if (typingIdle.current) clearTimeout(typingIdle.current);
      if (!id || !typingOnRef.current) return;
      typingOnRef.current = false;
      void api(`/api/dm/${id}/typing`, {
        method: "POST",
        body: JSON.stringify({ typing: false }),
      }).catch(() => {});
    };
  }, [id]);

  function notifyTyping(active: boolean) {
    if (!id) return;
    if (!active) {
      if (typingIdle.current) {
        clearTimeout(typingIdle.current);
        typingIdle.current = null;
      }
      if (typingOnRef.current) {
        typingOnRef.current = false;
        void api(`/api/dm/${id}/typing`, {
          method: "POST",
          body: JSON.stringify({ typing: false }),
        }).catch(() => {});
      }
      return;
    }
    const now = Date.now();
    if (!typingOnRef.current || now - typingPingAt.current > 2000) {
      typingOnRef.current = true;
      typingPingAt.current = now;
      void api(`/api/dm/${id}/typing`, {
        method: "POST",
        body: JSON.stringify({ typing: true }),
      }).catch(() => {});
    }
    if (typingIdle.current) clearTimeout(typingIdle.current);
    typingIdle.current = setTimeout(() => notifyTyping(false), 4000);
  }

  function handleDraft(next: string) {
    setDraft(next);
    notifyTyping(next.trim().length > 0);
  }

  function openPayment(paymentId: string) {
    router.push(`/service-payments/${paymentId}` as Href);
  }

  function paymentCta(invoice: ServicePayment | undefined, iPay: boolean) {
    if (invoice?.status === "DELIVERED" && iPay) return t("svc_pay_confirm_delivery");
    if (invoice?.status === "PAID" || invoice?.status === "DELIVERED") {
      return t("svc_pay_open");
    }
    if (iPay) return t("svc_pay_pay");
    return t("svc_pay_open");
  }

  async function reactToMessage(messageId: string, emoji: string) {
    setReactingToId(null);
    const previous = messages;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, reactions: toggleReactionSummaries(m.reactions ?? [], emoji) }
          : m
      )
    );
    if (!id) return;
    try {
      const data = await api<{ reactions?: ReactionSummary[] }>(
        `/api/dm/${id}/messages/${messageId}/reaction`,
        { method: "PUT", body: JSON.stringify({ emoji }) }
      );
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, reactions: data.reactions ?? [] } : m
        )
      );
    } catch {
      setMessages(previous);
      setError(t("react_failed"));
    }
  }

  async function shareMessage(message: Message) {
    setReactingToId(null);
    const url = message.attachmentUrl ? mediaUrl(message.attachmentUrl) : "";
    const caption = isAttachmentOnlyBody(message.body)
      ? ""
      : (message.body || "").trim();
    try {
      if (url && caption) {
        await Share.share({
          title: t("dm_share"),
          message: `${caption}\n${url}`,
          url,
        });
      } else if (url) {
        await Share.share({ title: t("dm_share"), message: url, url });
      } else if (caption) {
        await Share.share({ title: t("dm_share"), message: caption });
      }
    } catch {
      setError(t("dm_share_failed"));
    }
  }

  async function openForward(message: Message) {
    setReactingToId(null);
    setForwardMessage(message);
    setForwardThreads([]);
    setForwardLoading(true);
    try {
      const data = await api<{ threads?: ForwardThread[] }>("/api/dm");
      setForwardThreads((data.threads ?? []).filter((th) => th.id !== id));
    } catch {
      setError(t("dm_forward_failed"));
      setForwardMessage(null);
    } finally {
      setForwardLoading(false);
    }
  }

  async function forwardTo(threadId: string) {
    if (!forwardMessage || forwardBusy) return;
    const body = (forwardMessage.body || "").trim();
    const attachment = (forwardMessage.attachmentUrl || "").trim();
    if (!body && !attachment) {
      setError(t("dm_forward_failed"));
      return;
    }
    setForwardBusy(true);
    try {
      await api(`/api/dm/${threadId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          body: body || " ",
          ...(attachment ? { attachmentUrl: attachment } : {}),
        }),
      });
      setPayOk(t("dm_forward_ok"));
      setForwardMessage(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dm_forward_failed"));
    } finally {
      setForwardBusy(false);
    }
  }

  async function sendPaymentRequest() {
    if (!id || !peerId || payBusy) return;
    const amount = Number(payAmount.replace(",", "."));
    if (payTitle.trim().length < 3 || !Number.isFinite(amount) || amount <= 0) {
      setError(t("svc_pay_need_service_price"));
      return;
    }
    setPayBusy(true);
    setError("");
    setPayOk("");
    try {
      await api("/api/service-payments", {
        method: "POST",
        body: JSON.stringify({
          clientId: peerId,
          threadId: id,
          title: payTitle.trim(),
          description: payDescription.trim(),
          amount,
          processingDays: payDays,
        }),
      });
      setShowPayForm(false);
      setPayTitle("");
      setPayAmount("");
      setPayDescription("");
      setPayDays(3);
      setPayOk(t("svc_pay_sent_ok"));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("svc_pay_need_service_price"));
    } finally {
      setPayBusy(false);
    }
  }

  function confirmDeleteFile(message: Message) {
    if (message.senderId !== user?.id || !message.attachmentUrl) return;
    setReactingToId(null);
    Alert.alert(t("dm_delete_file"), t("dm_delete_file_confirm"), [
        { text: t("cancel"), style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => void deleteAttachment(message),
        },
      ]
    );
  }

  async function deleteAttachment(message: Message) {
    if (!id) return;
    setError("");
    try {
      const data = await api<{ deletedMessage?: boolean }>(
        `/api/dm/${id}/messages/${message.id}`,
        { method: "DELETE" }
      );
      if (data.deletedMessage) {
        setMessages((prev) => prev.filter((m) => m.id !== message.id));
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === message.id ? { ...m, attachmentUrl: null } : m
          )
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dm_delete_file_failed"));
    }
  }

  async function startCall() {
    if (!id || calling) return;
    stopAllVoicePlayback();
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setError("Autorisez le micro pour appeler.");
      return;
    }
    setCalling(true);
    setError("");
    try {
      const call = await createOutgoingCall(id, "AUDIO");
      startOutgoing({
        ...call,
        direction: "outbound",
        peer: call.peer || { displayName: peer, avatarUrl: peerAvatar },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("call_failed"));
    } finally {
      setCalling(false);
    }
  }

  async function send() {
    const body = draft.trim();
    if (!body || !id) return;
    setSending(true);
    setError("");
    try {
      await api(`/api/dm/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      setDraft("");
      notifyTyping(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Envoi impossible");
    } finally {
      setSending(false);
    }
  }

  async function sendVoice(file: VoicePickedFile) {
    if (!id) return;
    stopAllVoicePlayback();
    setSending(true);
    setError("");
    try {
      const att = await uploadFile("/api/community/upload", file);
      await api(`/api/dm/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({
          body: "Note vocale",
          attachmentUrl: att.url,
        }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d’envoyer la note vocale.");
      throw e;
    } finally {
      setSending(false);
    }
  }

  async function sendFiles(files: VoicePickedFile[]) {
    if (!id || !files.length) return;
    stopAllVoicePlayback();
    const caption = draft.trim();
    setSending(true);
    setError("");
    try {
      for (const [index, file] of files.entries()) {
        const att = await uploadFile("/api/community/upload", file);
        await api(`/api/dm/${id}/messages`, {
          method: "POST",
          body: JSON.stringify({
            attachmentUrl: att.url,
            ...(index === 0 && caption ? { body: caption } : {}),
          }),
        });
      }
      setDraft("");
      notifyTyping(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("attach_failed"));
    } finally {
      setSending(false);
    }
  }

  async function pickAttachments() {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "application/pdf",
      ],
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (result.canceled) return;
    const files = (result.assets ?? []).slice(0, 10).map((asset) => ({
      uri: asset.uri,
      name: asset.name || fileNameFromUri(asset.uri, "fichier.pdf"),
      type: guessMime(asset.name || "fichier.pdf", asset.mimeType),
    }));
    await sendFiles(files);
  }

  async function downloadAttachment(url: string) {
    try {
      await Share.share({
        url,
        message: url,
        title: t("download_attachment"),
      });
    } catch {
      await Linking.openURL(url);
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
    <Screen style={{ padding: 12, paddingBottom: 8 }}>
      <Stack.Screen
        options={{
          headerTintColor: colors.accent,
          headerStyle: { backgroundColor: colors.surface },
          headerTitleAlign: "left",
          headerTitle: () => (
            <View style={{ maxWidth: 220 }}>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 17,
                  fontWeight: "600",
                  color: colors.foreground,
                }}
              >
                {peer || t("dm_direct_chat")}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 2,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor:
                      peerTyping || peerOnline ? "#22c55e" : colors.muted,
                  }}
                />
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 12,
                    color: peerTyping || peerOnline ? "#15803d" : colors.muted,
                  }}
                >
                  {peerTyping
                    ? t("typing")
                    : peerOnline
                      ? t("online")
                      : t("offline")}
                </Text>
              </View>
            </View>
          ),
          headerRight: () => (
            <Pressable
              onPress={() => void startCall()}
              disabled={calling || sending}
              accessibilityLabel={t("call_audio")}
              hitSlop={8}
              style={{ paddingHorizontal: 8, opacity: calling || sending ? 0.4 : 1 }}
            >
              <Ionicons name="call" size={22} color={colors.accent} />
            </Pressable>
          ),
        }}
      />
      <ErrorText>{error}</ErrorText>
      {payOk ? (
        <Text style={{ color: "#047857", fontSize: 13, marginBottom: 6 }}>{payOk}</Text>
      ) : null}
      {sending ? <Muted>{t("uploading")}</Muted> : null}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 12, gap: 8 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          onScrollBeginDrag={() => setReactingToId(null)}
          ListFooterComponent={peerTyping ? <TypingBubble /> : null}
          ListHeaderComponent={
            invoices.length ? (
              <View style={{ marginBottom: 8, gap: 6 }}>
                <Text
                  style={{
                    fontWeight: "700",
                    fontSize: 14,
                    color: colors.foreground,
                  }}
                >
                  {t("svc_pay_in_chat")}
                </Text>
                {invoices.map((p) => {
                  const iPay = p.clientId === user?.id;
                  const open = isServicePaymentOpen(p.status);
                  const followUp = p.status === "PAID" || p.status === "DELIVERED";
                  const statusKey = servicePaymentStatusKey(
                    p.status,
                    iPay,
                    p.escrowUntilConfirm
                  );
                  const amountLabel = formatMoneyFromCents(
                    p.amountCents ?? 0,
                    p.currency || "CAD"
                  );
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => {
                        if (open || followUp) openPayment(p.id);
                      }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: colors.surface2,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                      }}
                    >
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text
                          style={{
                            fontWeight: "600",
                            fontSize: 14,
                            color: colors.foreground,
                          }}
                        >
                          {p.title || t("svc_pay_title")}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.muted }}>
                          {amountLabel}
                          {statusKey ? ` · ${t(statusKey)}` : ""}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: open || followUp ? colors.accent : colors.muted,
                          fontSize: 12,
                          fontWeight: "700",
                        }}
                      >
                        {open || followUp
                          ? paymentCta(p, iPay)
                          : t(statusKey ?? "svc_pay_status_PAID")}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const mine = item.senderId === user?.id;
            const url = item.attachmentUrl ? mediaUrl(item.attachmentUrl) : "";
            const voice = isVoiceMessage(item.attachmentUrl, item.body);
            const paymentId = paymentIdFromMessage(item);
            const invoice = paymentId
              ? invoices.find((p) => p.id === paymentId)
              : undefined;
            const displayBody = paymentId
              ? stripServicePaymentLinks(item.body || "")
              : item.body;
            const showBody = !isAttachmentOnlyBody(displayBody) && !voice;
            const fileName = url ? fileNameFromUri(url, t("attachment_label")) : "";
            const labelColor = mine ? "#fff" : colors.foreground;
            const mutedOnBubble = mine ? "rgba(255,255,255,0.85)" : colors.muted;
            const iPay = invoice?.clientId === user?.id;
            const paymentOpen =
              !invoice ||
              isServicePaymentOpen(invoice.status) ||
              invoice.status === "PAID" ||
              invoice.status === "DELIVERED";
            const statusKey = servicePaymentStatusKey(
              invoice?.status,
              iPay,
              invoice?.escrowUntilConfirm
            );
            return (
              <View
                style={{
                  alignSelf: mine ? "flex-end" : "flex-start",
                  maxWidth: "88%",
                }}
              >
                {reactingToId === item.id ? (
                  <DmReactionPicker
                    alignEnd={mine}
                    onPick={(emoji) => void reactToMessage(item.id, emoji)}
                    onShare={() => void shareMessage(item)}
                    onForward={() => void openForward(item)}
                    onDelete={
                      mine && item.attachmentUrl
                        ? () => confirmDeleteFile(item)
                        : undefined
                    }
                  />
                ) : null}
                <Pressable
                  onPress={() => {
                    if (reactingToId && reactingToId !== item.id) {
                      setReactingToId(null);
                    }
                  }}
                  onLongPress={() =>
                    setReactingToId((cur) => (cur === item.id ? null : item.id))
                  }
                  delayLongPress={400}
                >
                  <View
                    style={{
                      backgroundColor: mine ? colors.accent : colors.surface2,
                      borderWidth: mine ? 0 : 1,
                      borderColor: colors.border,
                      borderRadius: 16,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                {voice && url ? (
                  <VoiceNoteBubble url={url} mine={mine} />
                ) : url ? (
                  <View>
                    <Pressable onPress={() => void Linking.openURL(url)}>
                      {isImageAttachment(item.attachmentUrl) ? (
                        <Image
                          source={{ uri: url }}
                          style={{ width: 220, height: 160, borderRadius: 10 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                            padding: 10,
                            borderRadius: 8,
                            backgroundColor: mine
                              ? "rgba(255,255,255,0.15)"
                              : colors.surface,
                          }}
                        >
                          <Ionicons
                            name="document"
                            size={22}
                            color={mine ? "#fff" : colors.accent}
                          />
                          <Text
                            style={{ color: labelColor, fontSize: 13, flex: 1 }}
                            numberOfLines={2}
                          >
                            {fileName}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                    <Pressable
                      onPress={() => void downloadAttachment(url)}
                      accessibilityLabel={t("download_attachment")}
                      hitSlop={8}
                      style={{
                        alignSelf: "flex-start",
                        marginTop: 4,
                        padding: 4,
                      }}
                    >
                      <Ionicons
                        name="download-outline"
                        size={18}
                        color={mutedOnBubble}
                      />
                    </Pressable>
                  </View>
                ) : null}
                {showBody ? (
                  <Text style={{ color: labelColor, marginTop: url && !voice ? 4 : 0 }}>
                    {displayBody}
                  </Text>
                ) : null}
                {paymentId && paymentOpen ? (
                  <Pressable
                    onPress={() => openPayment(paymentId)}
                    style={{ marginTop: 4, paddingVertical: 4 }}
                  >
                    <Text
                      style={{
                        color: mine ? "#fff" : colors.accent,
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      {paymentCta(invoice, iPay)}
                    </Text>
                  </Pressable>
                ) : paymentId ? (
                  <Text
                    style={{
                      color: mine ? "rgba(255,255,255,0.9)" : colors.muted,
                      fontSize: 12,
                      fontWeight: "700",
                      marginTop: 4,
                    }}
                  >
                    {t(statusKey ?? "svc_pay_status_PAID")}
                  </Text>
                ) : null}
                  </View>
                </Pressable>
                <DmReactionChips
                  reactions={item.reactions ?? []}
                  mine={mine}
                  onToggle={(emoji) => void reactToMessage(item.id, emoji)}
                />
              </View>
            );
          }}
        />
        {canInvoice ? (
          <View style={{ marginTop: 4 }}>
            <Pressable
              onPress={() => setShowPayForm((v) => !v)}
              disabled={payBusy || !peerId}
              style={{ paddingVertical: 8, opacity: payBusy || !peerId ? 0.5 : 1 }}
            >
              <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 14 }}>
                {showPayForm ? t("cancel") : t("svc_pay_request")}
              </Text>
            </Pressable>
            {showPayForm ? (
              <View style={{ gap: 4, marginBottom: 8 }}>
                <Muted>{t("svc_pay_request_hint")}</Muted>
                <Field
                  label={t("svc_pay_service_name")}
                  value={payTitle}
                  onChangeText={(v) => setPayTitle(v.slice(0, 160))}
                />
                <Field
                  label={t("svc_pay_amount")}
                  value={payAmount}
                  onChangeText={(v) =>
                    setPayAmount(v.replace(/[^0-9.,]/g, "").slice(0, 12))
                  }
                  keyboardType="decimal-pad"
                />
                <Field
                  label={t("description")}
                  value={payDescription}
                  onChangeText={(v) => setPayDescription(v.slice(0, 2000))}
                  multiline
                />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: colors.foreground,
                    marginBottom: 6,
                  }}
                >
                  {t("svc_pay_processing_days")}
                </Text>
                <ChipRow>
                  {PROCESSING_DAYS.map((d) => (
                    <Chip
                      key={d}
                      label={`${d} ${d <= 1 ? t("svc_pay_day") : t("svc_pay_days")}`}
                      selected={payDays === d}
                      onPress={() => setPayDays(d)}
                    />
                  ))}
                </ChipRow>
                <Muted>{t("svc_pay_processing_hint")}</Muted>
                <Button
                  label={payBusy ? t("loading") : t("svc_pay_send_request")}
                  onPress={() => void sendPaymentRequest()}
                  disabled={payBusy}
                  loading={payBusy}
                />
              </View>
            ) : null}
          </View>
        ) : null}
        <ChatComposer
          draft={draft}
          onDraftChange={handleDraft}
          sending={sending}
          onSend={() => void send()}
          onAttach={() => void pickAttachments()}
          onRecorded={sendVoice}
        />
      </KeyboardAvoidingView>
      <Modal
        visible={Boolean(forwardMessage)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!forwardBusy) setForwardMessage(null);
        }}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "center",
            padding: 24,
          }}
          onPress={() => {
            if (!forwardBusy) setForwardMessage(null);
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 16,
              maxHeight: "70%",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  flex: 1,
                  fontSize: 16,
                  fontWeight: "700",
                  color: colors.foreground,
                }}
              >
                {t("dm_forward_title")}
              </Text>
              <Pressable
                onPress={() => {
                  if (!forwardBusy) setForwardMessage(null);
                }}
                accessibilityLabel={t("close")}
                hitSlop={8}
                disabled={forwardBusy}
              >
                <Ionicons name="close" size={22} color={colors.foreground} />
              </Pressable>
            </View>
            {forwardLoading ? (
              <ActivityIndicator color={colors.accent} />
            ) : forwardThreads.length === 0 ? (
              <Muted>{t("dm_forward_empty")}</Muted>
            ) : (
              <FlatList
                data={forwardThreads}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 360 }}
                renderItem={({ item: thread }) => {
                  const name = thread.peer?.displayName || t("dm_direct_chat");
                  const src = thread.peer?.avatarUrl
                    ? mediaUrl(thread.peer.avatarUrl)
                    : "";
                  return (
                    <Pressable
                      onPress={() => void forwardTo(thread.id)}
                      disabled={forwardBusy}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        paddingVertical: 8,
                        opacity: forwardBusy ? 0.5 : 1,
                      }}
                    >
                      {src ? (
                        <Image
                          source={{ uri: src }}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: colors.accentSoft,
                          }}
                        />
                      ) : (
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: colors.accentSoft,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              color: colors.accent,
                              fontWeight: "700",
                              fontSize: 14,
                            }}
                          >
                            {(name || "R").slice(0, 1).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <Text
                        numberOfLines={1}
                        style={{
                          flex: 1,
                          fontSize: 15,
                          fontWeight: "600",
                          color: colors.foreground,
                        }}
                      >
                        {name}
                      </Text>
                    </Pressable>
                  );
                }}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
