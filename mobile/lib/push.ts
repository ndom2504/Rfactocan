import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import * as Device from "expo-device";
import { Platform } from "react-native";
import type { Href } from "expo-router";
import { api } from "@/lib/api";
import {
  FCM_CHANNEL_ALERTS,
  FCM_CHANNEL_CALLS,
  FCM_CHANNEL_IN_CALL,
  FCM_CHANNEL_JOBS,
  FCM_CHANNEL_MESSAGES,
} from "@/lib/fcm-channels";

const SOUND = "rfacto_notify.wav";
const ACCENT = "#28541D";

type NotificationsModule = typeof import("expo-notifications");

export type PushPayload = {
  href?: string;
  type?: string;
  callId?: string;
  threadId?: string;
};

const pushListeners = new Set<() => void>();
const incomingCallListeners = new Set<(payload: PushPayload) => void>();

export function onPushReceived(listener: () => void) {
  pushListeners.add(listener);
  return () => {
    pushListeners.delete(listener);
  };
}

export function onIncomingCallPush(listener: (payload: PushPayload) => void) {
  incomingCallListeners.add(listener);
  return () => {
    incomingCallListeners.delete(listener);
  };
}

function emitPushReceived() {
  for (const listener of [...pushListeners]) {
    try {
      listener();
    } catch {
      /* ignore */
    }
  }
}

function readPushData(data: unknown): PushPayload {
  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    href: typeof raw.href === "string" ? raw.href : undefined,
    type: typeof raw.type === "string" ? raw.type : undefined,
    callId: typeof raw.callId === "string" ? raw.callId : undefined,
    threadId: typeof raw.threadId === "string" ? raw.threadId : undefined,
  };
}

function emitIncomingCallIfNeeded(payload: PushPayload) {
  if ((payload.type ?? "").toUpperCase() !== "INCOMING_CALL") return;
  for (const listener of [...incomingCallListeners]) {
    try {
      listener(payload);
    } catch {
      /* ignore */
    }
  }
}

export function isExpoGo() {
  return Constants.appOwnership === "expo";
}

async function loadNotifications(): Promise<NotificationsModule | null> {
  if (isExpoGo()) return null;
  try {
    const Notifications = await import("expo-notifications");
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    return Notifications;
  } catch (error) {
    console.warn("[push] expo-notifications unavailable", error);
    return null;
  }
}

const EAS_PROJECT_ID = "d8977989-e19b-4dfa-92e3-25e47b779597";

async function readPushToken(Notifications: NotificationsModule) {
  if (Platform.OS === "ios") {
    const projectId =
      Constants.easConfig?.projectId ??
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)
        ?.eas?.projectId ??
      EAS_PROJECT_ID;
    const expo = await Notifications.getExpoPushTokenAsync({ projectId });
    return typeof expo.data === "string" ? expo.data.trim() : "";
  }
  const device = await Notifications.getDevicePushTokenAsync();
  return typeof device.data === "string" ? device.data.trim() : "";
}

async function ensureAndroidChannels(Notifications: NotificationsModule) {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(FCM_CHANNEL_MESSAGES, {
      name: "Messages",
      description: "Messages et conversations",
      importance: Notifications.AndroidImportance.HIGH,
      sound: SOUND,
      vibrationPattern: [0, 250, 120, 250],
      lightColor: ACCENT,
      enableVibrate: true,
      showBadge: true,
    });
    await Notifications.setNotificationChannelAsync(FCM_CHANNEL_ALERTS, {
      name: "Alertes Rfacto",
      description: "Commandes, paiements et alertes",
      importance: Notifications.AndroidImportance.HIGH,
      sound: SOUND,
      vibrationPattern: [0, 250, 120, 250],
      lightColor: ACCENT,
      enableVibrate: true,
      showBadge: true,
    });
    await Notifications.setNotificationChannelAsync(FCM_CHANNEL_JOBS, {
      name: "Alertes jobs proches",
      description: "Nouvelles commandes et services près de vous",
      importance: Notifications.AndroidImportance.HIGH,
      sound: SOUND,
      vibrationPattern: [0, 250, 120, 250],
      lightColor: ACCENT,
      enableVibrate: true,
      showBadge: true,
    });
    await Notifications.setNotificationChannelAsync(FCM_CHANNEL_CALLS, {
      name: "Appels Rfacto",
      description: "Appels audio et vidéo entrants",
      importance: Notifications.AndroidImportance.MAX,
      sound: SOUND,
      vibrationPattern: [0, 400, 200, 400, 200, 400],
      lightColor: ACCENT,
      enableVibrate: true,
      showBadge: true,
    });
    await Notifications.setNotificationChannelAsync(FCM_CHANNEL_IN_CALL, {
      name: "Appel en cours",
      description: "Notification persistante pendant un appel",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
      enableVibrate: false,
      showBadge: false,
    });
  } catch (error) {
    console.warn("[push] channels", error);
  }
}

let registerInFlight: Promise<void> | null = null;
let lastPostedToken = "";
let lastPostedAt = 0;

export async function clearAppBadge() {
  if (isExpoGo()) return;
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch {
    /* ignore */
  }
}

export async function registerPushToken(force = false) {
  if (isExpoGo() || !Device.isDevice) return;
  if (registerInFlight) return registerInFlight;
  registerInFlight = (async () => {
    const Notifications = await loadNotifications();
    if (!Notifications) return;
    try {
      const current = await Notifications.getPermissionsAsync();
      let status = current.status;
      if (status !== "granted") {
        const asked = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowDisplayInCarPlay: false,
            allowCriticalAlerts: false,
            provideAppNotificationSettings: false,
            allowProvisional: false,
          },
        });
        status = asked.status;
      }
      if (status !== "granted") {
        console.warn("[push] permission not granted", status);
        return;
      }

      // Required on iOS so APNs device token is issued before Expo token.
      await Notifications.getDevicePushTokenAsync().catch((error) => {
        console.warn("[push] device token", error);
      });

      await ensureAndroidChannels(Notifications);
      const token = await readPushToken(Notifications);
      if (token.length < 20) {
        console.warn("[push] empty expo/device token");
        return;
      }
      // Always upsert at least every 6h (or when forced) so pruned server tokens recover.
      const freshEnough =
        !force &&
        token === lastPostedToken &&
        Date.now() - lastPostedAt < 6 * 60 * 60 * 1000;
      if (freshEnough) return;
      await api("/api/devices/fcm", {
        method: "POST",
        body: JSON.stringify({
          token,
          platform: Platform.OS === "ios" ? "IOS" : "ANDROID",
        }),
      });
      lastPostedToken = token;
      lastPostedAt = Date.now();
    } catch (error) {
      console.warn("[push] register skipped", error);
    }
  })().finally(() => {
    registerInFlight = null;
  });
  return registerInFlight;
}

/** Ask permission, register token, then ask the API to send a test push. */
export async function testPushNotification(): Promise<{
  ok: boolean;
  message: string;
}> {
  await registerPushToken(true);
  try {
    const data = await api<{
      ok?: boolean;
      sent?: number;
      error?: string;
      hint?: string;
      tokens?: Array<{ platform: string; expo: boolean }>;
    }>("/api/devices/push-test", { method: "POST" });
    if (!data.ok) {
      return { ok: false, message: data.error || "Échec du test push." };
    }
    if (!data.sent) {
      return {
        ok: false,
        message:
          data.hint ||
          "Aucun jeton push envoyé. Activez les notifications dans Réglages iPhone → Rfacto.",
      };
    }
    return {
      ok: true,
      message:
        "Notification de test envoyée. Fermez l’app et vérifiez la bannière.",
    };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Échec du test push.",
    };
  }
}

export async function unregisterPushToken() {
  if (isExpoGo()) return;
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  try {
    const token = await readPushToken(Notifications);
    lastPostedToken = "";
    lastPostedAt = 0;
    if (token.length < 20) return;
    await api("/api/devices/fcm", {
      method: "DELETE",
      body: JSON.stringify({ token }),
    });
  } catch {
    /* already signed out or token unavailable */
  }
}

export function hrefToExpoRoute(href?: string | null): Href | null {
  if (!href) return null;
  const dm = /\/messages\/dm\/([^/?#]+)/.exec(href);
  if (dm) return `/messages/${dm[1]}` as Href;
  const inChat = /\/in\/chat\/([^/?#]+)/.exec(href);
  if (inChat) return `/in-chat/${inChat[1]}` as Href;
  const booking = /\/bookings\/([^/?#]+)/.exec(href);
  if (booking) return `/booking/${booking[1]}`;
  const trip = /\/trips\/([^/?#]+)/.exec(href);
  if (trip) return `/trip/${trip[1]}`;
  const request = /\/requests\/([^/?#]+)/.exec(href);
  if (request) return `/request/${request[1]}`;
  const community = /\/community\/([^/?#]+)/.exec(href);
  if (community) return `/community/${community[1]}`;
  const service = /\/services\/listing\/([^/?#]+)/.exec(href);
  if (service) return `/service/${service[1]}` as Href;
  const servicePay = /\/service-payments\/([^/?#]+)/.exec(href);
  if (servicePay) return `/service-payments/${servicePay[1]}` as Href;
  const shopProduct = /\/shops\/product\/([^/?#]+)/.exec(href);
  if (shopProduct) return `/shops/product/${shopProduct[1]}` as Href;
  const shop = /\/shops\/([^/?#]+)/.exec(href);
  if (shop && !["new", "orders", "search", "product"].includes(shop[1])) {
    return `/shops/${shop[1]}` as Href;
  }
  if (href.includes("/ambassador") || href.includes("/herald")) {
    return "/herald" as Href;
  }
  if (href.includes("/messages")) return "/(tabs)/messages";
  if (href.includes("/community")) return "/(tabs)/community";
  if (href.includes("/profile")) return "/profile";
  if (href.includes("/dashboard")) return "/(tabs)";
  return null;
}

function routeFromPush(payload: PushPayload): Href | null {
  const route = hrefToExpoRoute(payload.href);
  if (route) return route;
  const type = (payload.type ?? "").toUpperCase();
  if (payload.threadId && type.includes("MESSAGE")) {
    return `/messages/${payload.threadId}` as Href;
  }
  if (type.includes("MESSAGE")) return "/(tabs)/messages";
  return null;
}

export function watchPushNotifications(onOpenHref: (href: Href) => void) {
  if (isExpoGo()) return () => {};
  let cancelled = false;
  let unsub = () => {};
  void loadNotifications().then((Notifications) => {
    if (!Notifications || cancelled) return;
    const received = Notifications.addNotificationReceivedListener((event) => {
      emitPushReceived();
      const payload = readPushData(event.request.content.data);
      emitIncomingCallIfNeeded(payload);
    });
    const opened = new Set<string>();
    const openResponse = (
      event: {
        notification: {
          request: { identifier: string; content: { data: unknown } };
        };
      }
    ) => {
      const id = event.notification.request.identifier;
      if (opened.has(id)) return;
      opened.add(id);
      void SecureStore.setItemAsync("rfacto_last_push_open", id).catch(() => {});
      emitPushReceived();
      const payload = readPushData(event.notification.request.content.data);
      emitIncomingCallIfNeeded(payload);
      const route = routeFromPush(payload);
      if (route) onOpenHref(route);
    };
    const response = Notifications.addNotificationResponseReceivedListener(
      (event) => {
        openResponse(event);
      }
    );
    void Notifications.getLastNotificationResponseAsync()
      .then(async (last) => {
        if (cancelled || !last) return;
        const id = last.notification.request.identifier;
        const seen = await SecureStore.getItemAsync("rfacto_last_push_open").catch(
          () => null
        );
        if (seen === id) return;
        openResponse(last);
      })
      .catch(() => {});
    unsub = () => {
      received.remove();
      response.remove();
    };
  });
  return () => {
    cancelled = true;
    unsub();
  };
}
