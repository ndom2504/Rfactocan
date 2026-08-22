"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track, type RemoteTrack } from "livekit-client";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import {
  type ActiveCall,
  fetchCall,
  fetchLivekitJoin,
  isTerminalCallStatus,
  isVideoCall,
  postCallAction,
} from "@/lib/call-client";

type Props = {
  call: ActiveCall;
  onUpdate: (call: ActiveCall) => void;
  onClose: () => void;
};

export function CallOverlay({ call, onUpdate, onClose }: Props) {
  const { t } = useI18n();
  const video = isVideoCall(call.mediaType);
  const inbound = call.direction === "inbound";
  const ringing = call.status === "RINGING";
  const accepted = call.status === "ACCEPTED";

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const roomRef = useRef<Room | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const peerName = call.peer?.displayName || t("call_peer");

  useEffect(() => {
    if (!ringing && !accepted) return;
    const timer = window.setInterval(async () => {
      const next = await fetchCall(call.id);
      if (!next) return;
      onUpdate(next);
      if (isTerminalCallStatus(next.status)) {
        onClose();
      }
    }, 2000);
    return () => window.clearInterval(timer);
  }, [call.id, ringing, accepted, onUpdate, onClose]);

  useEffect(() => {
    if (!accepted) return;
    const started = Date.now();
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [accepted]);

  useEffect(() => {
    if (!ringing || !inbound) return;
    let ctx: AudioContext;
    let osc: OscillatorNode;
    let pulse = 0;
    try {
      ctx = new AudioContext();
      osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 440;
      gain.gain.value = 0.04;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      pulse = window.setInterval(() => {
        gain.gain.value = gain.gain.value > 0.01 ? 0.004 : 0.04;
      }, 500);
    } catch {
      return;
    }
    return () => {
      if (pulse) window.clearInterval(pulse);
      try {
        osc.stop();
        void ctx.close();
      } catch {
        /* already closed */
      }
    };
  }, [ringing, inbound]);

  useEffect(() => {
    if (!ringing || inbound) return;
    let stream: MediaStream | null = null;
    void navigator.mediaDevices
      .getUserMedia({ audio: true, video })
      .then((s) => {
        stream = s;
        s.getTracks().forEach((track) => track.stop());
      })
      .catch(() => {
        setError(t("call_mic_denied"));
      });
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [ringing, inbound, video, t]);

  useEffect(() => {
    if (!accepted) return;
    let cancelled = false;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    function attachRemote(track: RemoteTrack) {
      if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
        track.attach(remoteVideoRef.current);
      }
      if (track.kind === Track.Kind.Audio && remoteAudioRef.current) {
        track.attach(remoteAudioRef.current);
      }
    }

    room.on(RoomEvent.TrackSubscribed, (track) => attachRemote(track));
    room.on(RoomEvent.Disconnected, () => {
      setConnected(false);
    });

    void (async () => {
      const join = await fetchLivekitJoin(call.id);
      if (!join || cancelled) {
        if (!cancelled) setError(t("call_media_failed"));
        return;
      }
      try {
        await room.connect(join.livekitUrl, join.token);
        if (cancelled) {
          await room.disconnect();
          return;
        }
        await room.localParticipant.setMicrophoneEnabled(true);
        if (video) {
          await room.localParticipant.setCameraEnabled(true);
          const cam = room.localParticipant.getTrackPublication(
            Track.Source.Camera
          );
          if (cam?.track && localVideoRef.current) {
            cam.track.attach(localVideoRef.current);
          }
        }
        room.remoteParticipants.forEach((p) => {
          p.trackPublications.forEach((pub) => {
            if (pub.track) attachRemote(pub.track);
          });
        });
        setConnected(true);
        setError("");
      } catch {
        if (!cancelled) setError(t("call_mic_denied"));
      }
    })();

    return () => {
      cancelled = true;
      room.remoteParticipants.forEach((p) => {
        p.trackPublications.forEach((pub) => pub.track?.detach());
      });
      room.localParticipant.trackPublications.forEach((pub) =>
        pub.track?.detach()
      );
      void room.disconnect();
      roomRef.current = null;
    };
  }, [accepted, call.id, video, t]);

  async function accept() {
    setBusy(true);
    const next = await postCallAction(call.id, "accept");
    setBusy(false);
    if (next) onUpdate(next);
    else setError(t("call_failed"));
  }

  async function reject() {
    setBusy(true);
    await postCallAction(call.id, "reject");
    setBusy(false);
    onClose();
  }

  async function cancel() {
    setBusy(true);
    await postCallAction(call.id, "cancel");
    setBusy(false);
    onClose();
  }

  async function hangUp() {
    setBusy(true);
    await roomRef.current?.disconnect();
    await postCallAction(call.id, "end");
    setBusy(false);
    onClose();
  }

  async function toggleMute() {
    const next = !muted;
    setMuted(next);
    await roomRef.current?.localParticipant.setMicrophoneEnabled(!next);
  }

  async function toggleCam() {
    const next = !camOff;
    setCamOff(next);
    await roomRef.current?.localParticipant.setCameraEnabled(!next);
  }

  const mins = Math.floor(elapsed / 60);
  const secs = String(elapsed % 60).padStart(2, "0");
  const statusLabel = ringing
    ? inbound
      ? video
        ? t("call_incoming_video")
        : t("call_incoming")
      : t("call_ringing")
    : connected
      ? `${mins}:${secs}`
      : t("call_connecting");

  return (
    <div className="fixed inset-0 z-[220] flex flex-col bg-[#12210E] text-white">
      <audio ref={remoteAudioRef} autoPlay />
      {video && accepted ? (
        <div className="relative min-h-0 flex-1">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="absolute bottom-28 right-4 h-36 w-28 rounded-xl border border-white/30 object-cover shadow-lg"
          />
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
          <UserAvatar
            name={peerName}
            avatarUrl={call.peer?.avatarUrl}
            size="xl"
          />
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            {peerName}
          </h2>
        </div>
      )}

      <div className="px-6 pb-10 pt-4 text-center">
        <p className="text-sm text-white/80">{statusLabel}</p>
        {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {ringing && inbound ? (
            <>
              <Button
                size="lg"
                disabled={busy}
                className="bg-[#25D366] text-white hover:bg-[#1ebe57]"
                onClick={() => void accept()}
              >
                {t("call_accept")}
              </Button>
              <Button
                size="lg"
                variant="danger"
                disabled={busy}
                onClick={() => void reject()}
              >
                {t("call_reject")}
              </Button>
            </>
          ) : ringing ? (
            <Button
              size="lg"
              variant="danger"
              disabled={busy}
              onClick={() => void cancel()}
            >
              {t("cancel")}
            </Button>
          ) : (
            <>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => void toggleMute()}
              >
                {muted ? t("call_unmute") : t("call_mute")}
              </Button>
              {video ? (
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => void toggleCam()}
                >
                  {camOff ? t("call_camera_on") : t("call_camera_off")}
                </Button>
              ) : null}
              <Button
                size="lg"
                variant="danger"
                disabled={busy}
                onClick={() => void hangUp()}
              >
                {t("call_hangup")}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
