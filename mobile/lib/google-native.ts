import Constants from "expo-constants";
import { Platform } from "react-native";

export class GoogleNativeCancelled extends Error {
  constructor() {
    super("cancelled");
    this.name = "GoogleNativeCancelled";
  }
}

export class GoogleNativeUnavailable extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleNativeUnavailable";
  }
}

function isExpoGo() {
  return (
    Constants.appOwnership === "expo" ||
    Constants.executionEnvironment === "storeClient"
  );
}

function webClientId() {
  return process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || "";
}

function iosClientId() {
  return process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || "";
}

/** Native Google SDK (EAS / dev client). Impossible dans Expo Go. */
export function canUseNativeGoogle() {
  if (isExpoGo()) return false;
  if (!webClientId()) return false;
  if (Platform.OS === "ios" && !iosClientId()) return false;
  return true;
}

export async function signInWithGoogleNative() {
  try {
    const { GoogleSignin, isCancelledResponse } = await import(
      "@react-native-google-signin/google-signin"
    );

    GoogleSignin.configure({
      webClientId: webClientId(),
      iosClientId: iosClientId() || undefined,
      offlineAccess: false,
    });

    if (Platform.OS === "android") {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response) || response.type !== "success") {
      throw new GoogleNativeCancelled();
    }

    const idToken = response.data?.idToken;
    if (!idToken) {
      throw new GoogleNativeUnavailable("Google n'a pas renvoyé de jeton.");
    }
    return idToken;
  } catch (e) {
    if (e instanceof GoogleNativeCancelled || e instanceof GoogleNativeUnavailable) {
      throw e;
    }
    const message = e instanceof Error ? e.message : "Connexion Google native indisponible";
    throw new GoogleNativeUnavailable(message);
  }
}
