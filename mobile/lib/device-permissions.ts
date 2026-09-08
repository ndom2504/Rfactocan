import { Platform } from "react-native";
import { api } from "@/lib/api";
import { isExpoGo, registerPushToken } from "@/lib/push";

/**
 * Ask for push + location after sign-in. Camera / photos / contacts stay
 * on the action that needs them (Apple rejects unused launch prompts).
 */
export async function requestSignedInDeviceAccess() {
  await registerPushToken();
  await registerLocationHeartbeat();
}

async function registerLocationHeartbeat() {
  if (isExpoGo()) return;
  try {
    const Location = await import("expo-location");
    const current = await Location.getForegroundPermissionsAsync();
    let status = current.status;
    if (status === "undetermined") {
      const asked = await Location.requestForegroundPermissionsAsync();
      status = asked.status;
    }
    if (status !== "granted") return;

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    await api("/api/presence/location", {
      method: "POST",
      body: JSON.stringify({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      }),
    });
  } catch (error) {
    console.warn("[location] skipped", error);
  }
}

export async function sendLocationIfAllowed() {
  if (isExpoGo() || Platform.OS === "web") return;
  try {
    const Location = await import("expo-location");
    const current = await Location.getForegroundPermissionsAsync();
    if (current.status !== "granted") return;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    await api("/api/presence/location", {
      method: "POST",
      body: JSON.stringify({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      }),
    });
  } catch {
    /* ignore */
  }
}
