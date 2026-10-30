import Ionicons from "@expo/vector-icons/Ionicons";
import { requestRecordingPermissionsAsync, useAudioPlayer } from "expo-audio";
import { useCallback, useEffect, useState } from "react";
import { Image, Modal, Pressable, Text, View } from "react-native";
import { Button } from "@/components/ui";
import { mediaUrl } from "@/lib/api";
import {
  type ActiveCall,
  fetchCall,
  fetchLivekitJoin,
  isLivekitNativeAvailable,
  isTerminalCallStatus,
  postCallAction,
} from "@/lib/calls";
import { useI18n } from "@/lib/i18n";
import { colors } from "@/lib/theme";
import { stopAllVoicePlayback } from "@/lib/voice";

const RINGBACK = require("../assets/sounds/ringback.wav");

type Props = {
  call: ActiveCall;
  onUpdate: (call: ActiveCall) => void;
  onClose: () => void;
};

function CallMediaLazy(props: {
  serverUrl: string;
  token: string;
  onHangUp: () => void;
  busy?: boolean;
  onError: (message: string) => void;
}) {
  // Loaded only when WebRTC native is present (EAS / dev client).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { CallMedia } = require("./call-media") as typeof import("./call-media");
  return <CallMedia {...props} />;
}

function RoundControl({
  icon,
  label,
  onPress,
  bg = "rgba(255,255,255,0.18)",
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  bg?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={{ alignItems: "center", opacity: disabled ? 0.45 : 1, gap: 8 }}
    >
      <View
        style={{
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={24} color="#fff" />
      </View>
      <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12 }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function CallOverlay({ call, onUpdate, onClose }: Props) {
  const { t } = useI18n();
  const inbound = call.direction === "inbound";
  const ringing = call.status === "RINGING";
  const accepted = call.status === "ACCEPTED";
  const peerName = call.peer?.displayName?.trim() || "Membre";
  const peerPhoto = mediaUrl(call.peer?.avatarUrl);
  const native = isLivekitNativeAvailable();
  const playRingback = ringing && !inbound;

  const ringback = useAudioPlayer(RINGBACK, { updateInterval: 1000 });

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [join, setJoin] = useState<{ livekitUrl: string; token: string } | null>(
    null
  );

  useEffect(() => {
    stopAllVoicePlayback();
  }, [call.id]);

  useEffect(() => {
    if (!playRingback) {
      try {
        if (ringback.playing) ringback.pause();
      } catch {
        /* player may be released */
      }
      return;
    }
    try {
      ringback.loop = true;
      ringback.play();
    } catch {
      /* ignore */
    }
    return () => {
      try {
        if (ringback.playing) ringback.pause();
      } catch {
        /* ignore */
      }
    };
  }, [playRingback, ringback]);

  useEffect(() => {
    if (!ringing && !accepted) return;
    const timer = setInterval(async () => {
      const next = await fetchCall(call.id);
      if (!next) return;
      onUpdate({ ...next, direction: call.direction, peer: next.peer || call.peer });
      if (isTerminalCallStatus(next.status)) onClose();
    }, 2000);
    return () => clearInterval(timer);
  }, [call.id, call.direction, call.peer, ringing, accepted, onUpdate, onClose]);

  useEffect(() => {
    if (!accepted) return;
    const started = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [accepted]);

  useEffect(() => {
    if (!accepted || !native) return;
    let cancelled = false;
    void (async () => {
      const next = await fetchLivekitJoin(call.id);
      if (!cancelled) {
        if (next) setJoin(next);
        else setError("Impossible de rejoindre l’appel.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accepted, call.id, native]);

  const hangUp = useCallback(async () => {
    setBusy(true);
    await postCallAction(call.id, "end");
    setBusy(false);
    onClose();
  }, [call.id, onClose]);

  const mins = Math.floor(elapsed / 60);
  const secs = String(elapsed % 60).padStart(2, "0");
  const statusLabel = ringing
    ? inbound
      ? t("call_incoming")
      : t("call_ringing_status")
    : join
      ? `${mins}:${secs}`
      : native
        ? "Connexion…"
        : "Appel signalé — le son LiveKit n’est pas dans Expo Go. Décrocher / raccrocher fonctionne.";

  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen">
      <View
        style={{
          flex: 1,
          backgroundColor: "#12210E",
          alignItems: "center",
        }}
      >
        {peerPhoto ? (
          <Image
            source={{ uri: peerPhoto }}
            style={{ position: "absolute", width: "100%", height: "100%" }}
            resizeMode="cover"
            blurRadius={18}
          />
        ) : null}
        <View
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(18,33,14,0.55)",
          }}
        />
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 28,
            paddingVertical: 48,
            width: "100%",
          }}
        >
          <View style={{ alignItems: "center", width: "100%", marginTop: 36 }}>
            <View
              style={{
                width: 128,
                height: 128,
                borderRadius: 64,
                backgroundColor: colors.gold,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
                overflow: "hidden",
              }}
            >
              {peerPhoto ? (
                <Image
                  source={{ uri: peerPhoto }}
                  style={{ width: 128, height: 128 }}
                  resizeMode="cover"
                />
              ) : (
                <Text
                  style={{ fontSize: 48, fontWeight: "700", color: colors.greenDark }}
                >
                  {(peerName[0] || "?").toUpperCase()}
                </Text>
              )}
            </View>
            <Text
              style={{
                color: "#fff",
                fontSize: 28,
                marginBottom: 8,
                textAlign: "center",
                fontWeight: "600",
              }}
            >
              {peerName}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.8)", marginBottom: 12 }}>
              {statusLabel}
            </Text>
            {error ? (
              <Text style={{ color: "#fca5a5", marginBottom: 12, textAlign: "center" }}>
                {error}
              </Text>
            ) : null}
          </View>

          {accepted && native && join ? (
            <CallMediaLazy
              serverUrl={join.livekitUrl}
              token={join.token}
              onHangUp={() => void hangUp()}
              busy={busy}
              onError={setError}
            />
          ) : ringing && inbound ? (
            <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
              <Button
                label="Décrocher"
                onPress={() => {
                  void (async () => {
                    const perm = await requestRecordingPermissionsAsync();
                    if (!perm.granted) {
                      setError("Autorisez le micro pour décrocher.");
                      return;
                    }
                    setBusy(true);
                    const next = await postCallAction(call.id, "accept");
                    setBusy(false);
                    if (next) {
                      onUpdate({
                        ...next,
                        direction: "inbound",
                        peer: next.peer || call.peer,
                      });
                    } else setError("Impossible d’appeler.");
                  })();
                }}
                loading={busy}
              />
              <Button
                label="Refuser"
                variant="danger"
                onPress={() => {
                  setBusy(true);
                  void postCallAction(call.id, "reject").then(() => {
                    setBusy(false);
                    onClose();
                  });
                }}
                disabled={busy}
              />
            </View>
          ) : (
            <View style={{ width: "100%", alignItems: "center", gap: 28 }}>
              {!inbound || accepted ? (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 36,
                  }}
                >
                  <RoundControl
                    icon={muted ? "mic-off" : "mic"}
                    label={t("call_mute")}
                    onPress={() => setMuted((v) => !v)}
                    bg={muted ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.18)"}
                  />
                  <RoundControl
                    icon={speaker ? "volume-high" : "volume-medium"}
                    label={t("call_speaker")}
                    onPress={() => setSpeaker((v) => !v)}
                    bg={speaker ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.18)"}
                  />
                </View>
              ) : null}
              <RoundControl
                icon="call"
                label={ringing ? t("cancel") : t("call_hang_up")}
                onPress={() => {
                  if (busy) return;
                  setBusy(true);
                  if (ringing) {
                    void postCallAction(call.id, "cancel").then(() => {
                      setBusy(false);
                      onClose();
                    });
                  } else {
                    void hangUp();
                  }
                }}
                bg="#DC2626"
                disabled={busy}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
