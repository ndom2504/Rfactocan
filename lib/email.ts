import { Resend } from "resend";
import { getAppUrl } from "@/lib/app-url";

function getResend() {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

function fromAddress() {
  return (
    process.env.EMAIL_FROM?.trim() ||
    "Rfacto <onboarding@resend.dev>"
  );
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped: false; error: string };

async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  const resend = getResend();
  if (!resend) {
    console.info(
      "[email skipped — RESEND_API_KEY missing]",
      opts.subject,
      opts.to
    );
    return {
      ok: false,
      skipped: true,
      reason: "RESEND_API_KEY manquant",
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress(),
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });

    if (error) {
      const message =
        (error as { message?: string }).message ||
        (error as { error?: string }).error ||
        JSON.stringify(error);
      console.error("[email resend error]", opts.subject, opts.to, message);
      return { ok: false, skipped: false, error: message };
    }

    const id = data?.id ?? "unknown";
    console.info("[email sent via Resend]", { id, to: opts.to, subject: opts.subject });
    return { ok: true, id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur réseau Resend";
    console.error("[email exception]", opts.subject, message);
    return { ok: false, skipped: false, error: message };
  }
}

function layout(title: string, body: string) {
  const appUrl = getAppUrl();
  return `<!DOCTYPE html>
<html lang="fr">
<body style="font-family:Georgia,serif;background:#f3efe6;color:#14201c;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fffdf8;border:1px solid #c9d5cc;border-radius:12px;padding:28px;">
    <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#0f6b4c;">Rfacto</p>
    <h1 style="margin:0 0 16px;font-size:22px;">${title}</h1>
    <div style="font-size:15px;line-height:1.55;color:#14201c;">${body}</div>
    <p style="margin:24px 0 0;font-size:13px;color:#5f6f68;">
      <a href="${appUrl}" style="color:#0f6b4c;">Ouvrir Rfacto</a>
    </p>
  </div>
</body>
</html>`;
}

/** Direct Resend call for admin smoke-test. */
export async function sendTestEmail(to: string) {
  return sendEmail({
    to,
    subject: "Rfacto — test Resend OK",
    html: layout(
      "Test email",
      `<p>Si vous lisez ceci, Resend est correctement branché sur Rfacto.</p>
       <p>Envoyé à <strong>${to}</strong> via <code>resend.emails.send</code>.</p>`
    ),
  });
}

export async function emailBookingProposed(input: {
  travelerEmail: string;
  travelerName: string;
  senderName: string;
  route: string;
  bookingId: string;
}) {
  const url = `${getAppUrl()}/bookings/${input.bookingId}`;
  return sendEmail({
    to: input.travelerEmail,
    subject: `Nouvelle proposition de colis — ${input.route}`,
    html: layout(
      "Nouvelle proposition",
      `<p>Bonjour ${input.travelerName},</p>
       <p><strong>${input.senderName}</strong> souhaite réserver de l'espace sur votre trajet <strong>${input.route}</strong>.</p>
       <p><a href="${url}" style="display:inline-block;background:#0f6b4c;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">Voir la réservation</a></p>`
    ),
  });
}

export async function emailPaymentRequested(input: {
  senderEmail: string;
  senderName: string;
  travelerName: string;
  route: string;
  bookingId: string;
}) {
  const url = `${getAppUrl()}/bookings/${input.bookingId}`;
  return sendEmail({
    to: input.senderEmail,
    subject: `Paiement requis — ${input.route}`,
    html: layout(
      "Paiement sécurisé requis",
      `<p>Bonjour ${input.senderName},</p>
       <p><strong>${input.travelerName}</strong> a accepté votre colis sur <strong>${input.route}</strong>.</p>
       <p>Payez maintenant : les fonds restent bloqués jusqu'à la livraison.</p>
       <p><a href="${url}" style="display:inline-block;background:#0f6b4c;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">Payer avec Stripe</a></p>`
    ),
  });
}

export async function emailPaymentAuthorized(input: {
  senderEmail: string;
  travelerEmail: string;
  senderName: string;
  travelerName: string;
  route: string;
  bookingId: string;
  amountLabel: string;
}) {
  const url = `${getAppUrl()}/bookings/${input.bookingId}`;
  const body = (name: string, roleNote: string) =>
    layout(
      "Paiement confirmé",
      `<p>Bonjour ${name},</p>
       <p>Le paiement de <strong>${input.amountLabel}</strong> pour <strong>${input.route}</strong> est sécurisé (séquestre).</p>
       <p>${roleNote}</p>
       <p><a href="${url}" style="color:#0f6b4c;">Voir la réservation</a></p>`
    );

  await Promise.all([
    sendEmail({
      to: input.senderEmail,
      subject: `Paiement confirmé — ${input.route}`,
      html: body(
        input.senderName,
        "Vous pouvez maintenant coordonner la remise du colis avec le voyageur."
      ),
    }),
    sendEmail({
      to: input.travelerEmail,
      subject: `Paiement reçu (séquestre) — ${input.route}`,
      html: body(
        input.travelerName,
        "Les fonds seront versés sur votre compte après confirmation de livraison."
      ),
    }),
  ]);
}

export async function emailDelivered(input: {
  senderEmail: string;
  travelerEmail: string;
  senderName: string;
  travelerName: string;
  route: string;
  bookingId: string;
  payoutLabel: string;
}) {
  const url = `${getAppUrl()}/bookings/${input.bookingId}`;
  await Promise.all([
    sendEmail({
      to: input.senderEmail,
      subject: `Colis livré — ${input.route}`,
      html: layout(
        "Livraison confirmée",
        `<p>Bonjour ${input.senderName},</p>
         <p>La livraison de <strong>${input.route}</strong> est confirmée. Merci d'utiliser Rfacto.</p>
         <p><a href="${url}" style="color:#0f6b4c;">Laisser un avis</a></p>`
      ),
    }),
    sendEmail({
      to: input.travelerEmail,
      subject: `Paiement libéré — ${input.route}`,
      html: layout(
        "Fonds libérés",
        `<p>Bonjour ${input.travelerName},</p>
         <p>La livraison est confirmée. <strong>${input.payoutLabel}</strong> est en cours de versement vers votre compte bancaire (Stripe).</p>
         <p><a href="${url}" style="color:#0f6b4c;">Voir la réservation</a></p>`
      ),
    }),
  ]);
}

export async function emailPasswordReset(input: {
  email: string;
  displayName: string;
  resetUrl: string;
}) {
  return sendEmail({
    to: input.email,
    subject: "Réinitialisation de votre mot de passe Rfacto",
    html: layout(
      "Mot de passe oublié",
      `<p>Bonjour ${input.displayName},</p>
       <p>Vous avez demandé à réinitialiser votre mot de passe Rfacto.</p>
       <p>Ce lien est valable <strong>1 heure</strong> et ne peut être utilisé qu'une fois.</p>
       <p><a href="${input.resetUrl}" style="display:inline-block;background:#0f6b4c;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">Choisir un nouveau mot de passe</a></p>
       <p style="font-size:13px;color:#5f6f68;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`
    ),
  });
}
