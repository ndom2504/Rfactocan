import { Asset } from "expo-asset";
import { useVideoPlayer, VideoView } from "expo-video";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { Modal, StyleSheet, View } from "react-native";

const INTRO = require("../assets/videos/intro.mp4");
const FAILSAFE_MS = 14_000;

/**
 * Same intro as Android Studio (`res/raw/intro.mp4`).
 * Keep the native splash until the first frame, then play once.
 */
export function VideoSplash({ onFinished }: { onFinished: () => void }) {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const asset = Asset.fromModule(INTRO);
        await asset.downloadAsync();
        if (cancelled) return;
        const next = asset.localUri || asset.uri;
        if (next) {
          setUri(next);
          return;
        }
      } catch (error) {
        console.warn("[intro] asset", error);
      }
      if (!cancelled) onFinished();
    })();
    return () => {
      cancelled = true;
    };
  }, [onFinished]);

  if (!uri) {
    return <View style={styles.hold} />;
  }

  return <IntroPlayer uri={uri} onFinished={onFinished} />;
}

function IntroPlayer({
  uri,
  onFinished,
}: {
  uri: string;
  onFinished: () => void;
}) {
  const done = useRef(false);
  const started = useRef(false);

  function finishOnce() {
    if (done.current) return;
    done.current = true;
    onFinished();
  }

  const player = useVideoPlayer({ uri }, (next) => {
    next.loop = false;
    next.muted = false;
    next.volume = 1;
    next.audioMixingMode = "doNotMix";
  });

  useEffect(() => {
    const revealAndPlay = () => {
      if (started.current) return;
      started.current = true;
      void SplashScreen.hideAsync().catch(() => {});
      try {
        player.play();
      } catch {
        /* attached below */
      }
    };

    const ready = player.addListener("statusChange", ({ status: next }) => {
      if (next === "readyToPlay") revealAndPlay();
    });
    const loaded = player.addListener("sourceLoad", revealAndPlay);
    const ended = player.addListener("playToEnd", finishOnce);
    const timeout = setTimeout(finishOnce, FAILSAFE_MS);

    if (player.status === "readyToPlay") revealAndPlay();

    return () => {
      ready.remove();
      loaded.remove();
      ended.remove();
      clearTimeout(timeout);
    };
  }, [player]);

  return (
    <Modal
      visible
      transparent={false}
      animationType="none"
      statusBarTranslucent
      onRequestClose={finishOnce}
    >
      <View style={styles.wrap}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
          fullscreenOptions={{ enable: false }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  hold: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0f6b4c",
  },
  wrap: {
    flex: 1,
    backgroundColor: "#000",
  },
});
