/** iPhone often sends image/jpg, image/heic, or empty/octet-stream. */

export function normalizeImageContentType(type?: string | null, fileName = "") {
  let t = (type || "").toLowerCase().split(";")[0]?.trim() ?? "";
  if (!t || t === "application/octet-stream") {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (ext === "jpg" || ext === "jpeg") t = "image/jpeg";
    else if (ext === "png") t = "image/png";
    else if (ext === "webp") t = "image/webp";
    else if (ext === "gif") t = "image/gif";
    else if (ext === "heic" || ext === "heif") t = "image/heic";
  }
  if (t === "image/jpg" || t === "image/pjpeg") return "image/jpeg";
  if (t === "image/x-png") return "image/png";
  if (t === "image/heif") return "image/heic";
  return t;
}

export const PUBLIC_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
]);

export function isAllowedPublicImageType(type?: string | null, fileName = "") {
  return PUBLIC_IMAGE_TYPES.has(normalizeImageContentType(type, fileName));
}
