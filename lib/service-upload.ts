export const SERVICE_MAX_IMAGE_BYTES = 100 * 1024 * 1024;

export const SERVICE_ALLOWED_IMAGES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function normalizeContentType(type: string) {
  return (type || "").toLowerCase().split(";")[0]?.trim() ?? "";
}

export function isAllowedServiceImageType(type: string) {
  return SERVICE_ALLOWED_IMAGES.has(normalizeContentType(type));
}
