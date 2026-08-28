import type { DictKey } from "@/lib/i18n";

export type ServicePayment = {
  id: string;
  title?: string | null;
  description?: string | null;
  amountCents?: number | null;
  currency?: string | null;
  status?: string | null;
  payMethod?: string | null;
  receiverHint?: string | null;
  processingDays?: number | null;
  escrowUntilConfirm?: boolean | null;
  stripeTransferId?: string | null;
  providerId?: string | null;
  clientId?: string | null;
};

export function isServicePaymentOpen(status?: string | null) {
  return status === "AWAITING_PAYMENT" || status === "AWAITING_CONFIRMATION";
}

export function isServiceOrderSettled(
  status?: string | null,
  escrowUntilConfirm?: boolean | null
) {
  return (
    status === "CANCELLED" ||
    status === "EXPIRED" ||
    status === "FULFILLED" ||
    (status === "PAID" && escrowUntilConfirm !== true)
  );
}

export function servicePaymentStatusKey(
  status?: string | null,
  isClient = false,
  escrowUntilConfirm?: boolean | null
): DictKey | null {
  switch (status) {
    case "AWAITING_PAYMENT":
      return isClient ? "svc_pay_pending_to_pay" : "svc_pay_status_waiting";
    case "AWAITING_CONFIRMATION":
      return "svc_pay_status_AWAITING_CONFIRMATION";
    case "PAID":
      return escrowUntilConfirm === true
        ? "svc_pay_status_IN_PROGRESS"
        : "svc_pay_status_PAID";
    case "DELIVERED":
      return "svc_pay_status_DELIVERED";
    case "FULFILLED":
      return "svc_pay_status_FULFILLED";
    case "CANCELLED":
      return "svc_pay_status_CANCELLED";
    case "EXPIRED":
      return "svc_pay_status_EXPIRED";
    default:
      return null;
  }
}

export function servicePaymentIdFromBody(body: string) {
  return body.match(/\/service-payments\/([a-zA-Z0-9_-]+)/)?.[1] ?? null;
}

export function stripServicePaymentLinks(body: string) {
  return body
    .replace(/https?:\/\/\S*\/service-payments\/[a-zA-Z0-9_-]+/gi, "")
    .replace(/\/service-payments\/[a-zA-Z0-9_-]+/g, "")
    .trim();
}

export function paymentIdFromMessage(message: {
  body?: string | null;
  contextType?: string | null;
  contextId?: string | null;
}) {
  const raw = message.body || "";
  const fromBody = servicePaymentIdFromBody(raw);
  if (fromBody) return fromBody;
  if (
    message.contextType === "SERVICE" &&
    message.contextId &&
    /demande de paiement|payment request/i.test(raw)
  ) {
    return message.contextId;
  }
  return null;
}
