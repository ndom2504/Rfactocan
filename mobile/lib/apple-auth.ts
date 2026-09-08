import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";

export type AppleAuthPayload = {
  identityToken: string;
  nonce: string;
  email?: string;
  fullName?: {
    givenName?: string | null;
    familyName?: string | null;
  };
};

export function canUseAppleSignIn() {
  return Platform.OS === "ios";
}

export async function signInWithAppleNative(): Promise<AppleAuthPayload> {
  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    throw new Error("Connexion Apple indisponible sur cet appareil.");
  }

  const nonce = Crypto.randomUUID();
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce,
  });

  if (!credential.identityToken) {
    throw new Error("Apple n’a pas renvoyé de jeton.");
  }

  return {
    identityToken: credential.identityToken,
    nonce,
    email: credential.email || undefined,
    fullName: credential.fullName
      ? {
          givenName: credential.fullName.givenName,
          familyName: credential.fullName.familyName,
        }
      : undefined,
  };
}
