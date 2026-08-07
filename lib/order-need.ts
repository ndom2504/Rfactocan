/**
 * Client order / need types for the Commander form.
 */

export const ORDER_NEED_TYPES = [
  "PARCEL",
  "SERVICE",
  "PRODUCT",
  "JOB_SEEK",
  "JOB_OFFER",
] as const;
export type OrderNeedTypeId = (typeof ORDER_NEED_TYPES)[number];

export function isOrderNeedType(value: string): value is OrderNeedTypeId {
  return (ORDER_NEED_TYPES as readonly string[]).includes(value);
}

export function normalizeOrderNeedType(
  value: unknown
): OrderNeedTypeId {
  if (typeof value === "string" && isOrderNeedType(value.toUpperCase())) {
    return value.toUpperCase() as OrderNeedTypeId;
  }
  return "PARCEL";
}

/** Order side for parcels only. */
export type ParcelOrderSide = "send" | "receive";

export function normalizeParcelOrderSide(
  value: unknown
): ParcelOrderSide | null {
  if (value === "send" || value === "envoyer") return "send";
  if (value === "receive" || value === "recevoir") return "receive";
  return null;
}
