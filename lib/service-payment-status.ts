export const SERVICE_PROCESSING_DAYS = [1, 2, 3, 5, 7, 14, 30] as const;
export const DEFAULT_PROCESSING_DAYS = 3;

export function normalizeProcessingDays(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (
    Number.isInteger(n) &&
    (SERVICE_PROCESSING_DAYS as readonly number[]).includes(n)
  ) {
    return n;
  }
  return DEFAULT_PROCESSING_DAYS;
}

export function processingDueAtFrom(from: Date, days: number) {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isServicePaymentOpen(status: string) {
  return (
    status === "AWAITING_PAYMENT" || status === "AWAITING_CONFIRMATION"
  );
}

export function isServicePaymentTerminal(status: string) {
  return (
    status === "PAID" ||
    status === "DELIVERED" ||
    status === "FULFILLED" ||
    status === "CANCELLED" ||
    status === "EXPIRED"
  );
}

/** Poll / fulfillment UI: order is fully closed. */
export function isServiceOrderSettled(
  status: string,
  escrowUntilConfirm?: boolean | null
) {
  if (
    status === "CANCELLED" ||
    status === "EXPIRED" ||
    status === "FULFILLED"
  ) {
    return true;
  }
  if (status === "PAID" && !escrowUntilConfirm) return true;
  return false;
}

export function servicePaymentStatusI18nKey(
  status: string,
  opts: { isClient: boolean; escrowUntilConfirm?: boolean | null }
) {
  switch (status) {
    case "AWAITING_PAYMENT":
      return opts.isClient
        ? ("svc_pay_pending_to_pay" as const)
        : ("svc_pay_status_waiting" as const);
    case "AWAITING_CONFIRMATION":
      return "svc_pay_status_AWAITING_CONFIRMATION" as const;
    case "PAID":
      return opts.escrowUntilConfirm
        ? ("svc_pay_status_IN_PROGRESS" as const)
        : ("svc_pay_status_PAID" as const);
    case "DELIVERED":
      return "svc_pay_status_DELIVERED" as const;
    case "FULFILLED":
      return "svc_pay_status_FULFILLED" as const;
    case "CANCELLED":
      return "svc_pay_status_CANCELLED" as const;
    case "EXPIRED":
      return "svc_pay_status_EXPIRED" as const;
    default:
      return null;
  }
}

export function servicePaymentDeadlineFrom(hours = 48) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}
