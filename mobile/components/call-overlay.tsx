import { requestRecordingPermissionsAsync } from "expo-audio";
import { useCallback, useEffect, useState } from "react";
import { Modal, Text, View } from "react-native";
import { Button } from "@/components/ui";
import {
  type ActiveCall,
  fetchCall,
  fetchLivekitJoin,
  isLivekitNativeAvailable,
  isTerminalCallStatus,
  postCallAction,
} from "@/lib/calls";
import { colors } from "@/lib/theme";
import { stopAllVoicePlayback } from "@/lib/voice";

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

export function CallOverlay({ call, onUpdate, onClose }: Props) {
  const inbound = call.direction === "inbound";
  const ringing = call.status === "RINGING";
  const accepted = call.status === "ACCEPTED";
  const peerName = call.peer?.displayName?.trim() || "Membre";
  const native = isLivekitNativeAvailable();

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [join, setJoin] = useState<{ livekitUrl: string; token: string } | null>(
    null
  );

  useEffect(() => {
    stopAllVoicePlayback();
  }, [call.id]);

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
      ? "Appel entrant"
      : "Appel en cours…"
    : join
      ? `${mins}:${secs}`
      : native
        ? "Connexion…"
        : "Signalisation OK — le média LiveKit demande un build Rfacto.";

  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen">
      <View
        style={{
          flex: 1,
          backgroundColor: "#12210E",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: colors.gold,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 36, fontWeight: "700", color: colors.greenDark }}>
            {(peerName[0] || "?").toUpperCase()}
          </Text>
        </View>
        <Text
          style={{
            color: "#fff",
            fontSize: 24,
            fontWeight: "700",
            marginBottom: 8,
            textAlign: "center",
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

        {accepted && native && join ? (
          <CallMediaLazy
            serverUrl={join.livekitUrl}
            token={join.token}
            onHangUp={() => void hangUp()}
            busy={busy}
            onError={setError}
          />
        ) : ringing && inbound ? (
          <View style={{ flexDirection: "row", gap: 12 }}>
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
        ) : ringing ? (
          <Button
            label="Annuler"
            variant="danger"
            onPress={() => {
              setBusy(true);
              void postCallAction(call.id, "cancel").then(() => {
                setBusy(false);
                onClose();
              });
            }}
            loading={busy}
          />
        ) : (
          <Button
            label="Raccrocher"
            variant="danger"
            onPress={() => void hangUp()}
            loading={busy}
          />
        )}
      </View>
    </Modal>
  );
}
