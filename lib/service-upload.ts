import {
  isAllowedPublicImageType,
  PUBLIC_IMAGE_TYPES,
  normalizeImageContentType,
} from "@/lib/image-mime";

export const SERVICE_MAX_IMAGE_BYTES = 100 * 1024 * 1024;

export const SERVICE_ALLOWED_IMAGES = PUBLIC_IMAGE_TYPES;

export function normalizeContentType(type: string, fileName = "") {
  return normalizeImageContentType(type, fileName);
}

export function isAllowedServiceImageType(type: string, fileName = "") {
  return isAllowedPublicImageType(type, fileName);
}
