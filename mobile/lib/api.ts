import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "rfacto_token";

export function getApiUrl() {
  const url = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (url) return url.replace(/\/$/, "");
  // Production default — override with EXPO_PUBLIC_API_URL for local LAN IP
  return "https://www.rfacto.com";
}

export async function getToken() {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string | null) {
  if (!token) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export type ApiError = { error?: string; code?: string };

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${getApiUrl()}${path}`, {
    ...options,
    headers,
  });

  const data = (await res.json().catch(() => ({}))) as T & ApiError;
  if (!res.ok) {
    const message =
      (data as ApiError).error || `Erreur ${res.status}`;
    throw new Error(message);
  }
  return data;
}

export function mediaUrl(url?: string | null) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${getApiUrl()}${path}`;
}

export async function uploadFile(
  path: string,
  file: { uri: string; name: string; type: string }
): Promise<{ url: string; name?: string; contentType?: string }> {
  const token = await getToken();
  const form = new FormData();
  form.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob);
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${getApiUrl()}${path}`, {
    method: "POST",
    headers,
    body: form,
  });
  const data = (await res.json().catch(() => ({}))) as {
    url?: string;
    name?: string;
    contentType?: string;
    error?: string;
  };
  if (!res.ok || !data.url) {
    throw new Error(data.error || `Erreur ${res.status}`);
  }
  return { url: data.url, name: data.name, contentType: data.contentType };
}

export function isImageAttachment(url?: string | null) {
  if (!url) return false;
  try {
    const hay = decodeURIComponent(url);
    if (/\.(m4a|aac|mp3|ogg|oga|wav|amr|3gpp|weba|mp4|webm|mov|pdf)(\?|#|$)/i.test(hay)) {
      return false;
    }
    return /\.(jpe?g|png|gif|webp)(\?|#|$)/i.test(hay);
  } catch {
    return /\.(jpe?g|png|gif|webp)(\?|#|$)/i.test(url);
  }
}
