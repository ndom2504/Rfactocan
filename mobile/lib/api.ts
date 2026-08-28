import { File, UploadType } from "expo-file-system";
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

type LocalFile = { uri: string; name: string; type: string };

function toNativeUri(uri: string) {
  const clean = uri.split("?")[0];
  if (
    clean.startsWith("file:") ||
    clean.startsWith("content:") ||
    clean.startsWith("ph:") ||
    clean.startsWith("assets-library:")
  ) {
    return clean;
  }
  if (clean.startsWith("/")) return `file://${clean}`;
  return clean;
}

function parseJsonBody(body: string) {
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function nativeMultipart(
  path: string,
  file: LocalFile,
  fields?: Record<string, string>
) {
  const token = await getToken();
  const uri = toNativeUri(file.uri);
  const native = new File(uri);
  const result = await native.upload(`${getApiUrl()}${path}`, {
    httpMethod: "POST",
    uploadType: UploadType.MULTIPART,
    fieldName: "file",
    mimeType: file.type || "application/octet-stream",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    parameters: fields,
  });
  const data = parseJsonBody(result.body);
  if (result.status < 200 || result.status >= 300) {
    throw new Error(
      (typeof data.error === "string" && data.error) || `Erreur ${result.status}`
    );
  }
  return data;
}

export async function uploadFile(
  path: string,
  file: LocalFile
): Promise<{ url: string; name?: string; contentType?: string }> {
  const data = await nativeMultipart(path, file);
  const url = typeof data.url === "string" ? data.url : "";
  if (!url) {
    throw new Error(
      (typeof data.error === "string" && data.error) || "Échec du téléversement."
    );
  }
  return {
    url,
    name: typeof data.name === "string" ? data.name : file.name,
    contentType:
      typeof data.contentType === "string" ? data.contentType : file.type,
  };
}

export async function postMultipart<T = Record<string, unknown>>(
  path: string,
  file: LocalFile,
  fields?: Record<string, string>
): Promise<T> {
  return (await nativeMultipart(path, file, fields)) as T;
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
