import Constants from "expo-constants";
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

async function readPushToken(Notifications: NotificationsModule) {
  if (Platform.OS === "ios") {
    const projectId =
      Constants.easConfig?.projectId ??
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)
        ?.eas?.projectId;
    const expo = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
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

export async function registerPushToken() {
  if (isExpoGo() || !Device.isDevice) return;
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
        },
      });
      status = asked.status;
    }
    if (status !== "granted") return;
    await ensureAndroidChannels(Notifications);
    const token = await readPushToken(Notifications);
    if (token.length < 20) return;
    await api("/api/devices/fcm", {
      method: "POST",
      body: JSON.stringify({
        token,
        platform: Platform.OS === "ios" ? "IOS" : "ANDROID",
      }),
    });
  } catch (error) {
    console.warn("[push] register skipped", error);
  }
}

export async function unregisterPushToken() {
  if (isExpoGo()) return;
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  try {
    const token = await readPushToken(Notifications);
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
  if (href.includes("/ambassador") || href.includes("/herald")) {
    return "/herald" as Href;
  }
  if (href.includes("/messages")) return "/(tabs)/messages";
  if (href.includes("/community")) return "/(tabs)/community";
  if (href.includes("/profile")) return "/profile";
  if (href.includes("/dashboard")) return "/(tabs)";
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
    const response = Notifications.addNotificationResponseReceivedListener(
      (event) => {
        emitPushReceived();
        const payload = readPushData(event.notification.request.content.data);
        emitIncomingCallIfNeeded(payload);
        const route = hrefToExpoRoute(payload.href);
        if (route) {
          onOpenHref(route);
          return;
        }
        if ((payload.type ?? "").toUpperCase().includes("MESSAGE")) {
          onOpenHref("/(tabs)/messages");
        }
      }
    );
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
