import { Resend } from "resend";
import { getAppUrl } from "@/lib/app-url";

function getResend() {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

function fromAddress() {
  const raw =
    process.env.EMAIL_FROM?.trim() ||
    "Rfacto <onboarding@resend.dev>";
  return normalizeEmailFrom(raw);
}

/**
 * Resend requires `email@domain` or `Name <email@domain>`.
 * Common Vercel mistake: missing closing `>`.
 */
export function normalizeEmailFrom(value: string) {
  const v = value.trim().replace(/^["']|["']$/g, "");
  // Already plain email
  if (/^[^\s<>]+@[^\s<>]+$/.test(v)) return v;
  // Name <email> with optional missing >
  const m = v.match(/^(.+?)\s*<\s*([^<>@\s]+@[^<>@\s]+)\s*>?$/);
  if (m) {
    const name = m[1].trim();
    const email = m[2].trim();
    return name ? `${name} <${email}>` : email;
  }
  return v;
}

/** Public helper so auth routes can show which sender is configured. */
export function getEmailFromAddress() {
  return fromAddress();
}

export function isUsingResendTestSender() {
  return fromAddress().toLowerCase().includes("resend.dev");
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped: false; error: string; code?: "DOMAIN_NOT_VERIFIED" };

function classifyResendError(message: string): {
  error: string;
  code?: "DOMAIN_NOT_VERIFIED";
} {
  const lower = message.toLowerCase();
  if (
    lower.includes("only send testing emails to your own") ||
    lower.includes("verify a domain") ||
    (lower.includes("resend.dev") && lower.includes("domain"))
  ) {
    return {
      error:
        "L'envoi d'emails aux autres comptes nécessite un domaine vérifié sur Resend (pas onboarding@resend.dev).",
      code: "DOMAIN_NOT_VERIFIED",
    };
  }
  return { error: message };
}

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
      const raw =
        (error as { message?: string }).message ||
        (error as { error?: string }).error ||
        JSON.stringify(error);
      const classified = classifyResendError(raw);
      console.error(
        "[email resend error]",
        opts.subject,
        opts.to,
        classified.error,
        { from: fromAddress() }
      );
      return { ok: false, skipped: false, ...classified };
    }

    const id = data?.id ?? "unknown";
    console.info("[email sent via Resend]", { id, to: opts.to, subject: opts.subject });
    return { ok: true, id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur réseau Resend";
    const classified = classifyResendError(message);
    console.error("[email exception]", opts.subject, classified.error);
    return { ok: false, skipped: false, ...classified };
  }
}

function layout(title: string, body: string) {
  const appUrl = getAppUrl();
  return `<!DOCTYPE html>
<html lang="fr">
<body style="font-family:Georgia,serif;background:#f3efe6;color:#14201c;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fffdf8;border:1px solid #c9d5cc;border-radius:12px;padding:28px;">
    <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#28541D;">Rfacto</p>
    <h1 style="margin:0 0 16px;font-size:22px;">${title}</h1>
    <div style="font-size:15px;line-height:1.55;color:#14201c;">${body}</div>
    <p style="margin:24px 0 0;font-size:13px;color:#5f6f68;">
      <a href="${appUrl}" style="color:#28541D;">Ouvrir Rfacto</a>
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
       <p><a href="${url}" style="display:inline-block;background:#28541D;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">Voir la réservation</a></p>`
    ),
  });
}

export async function emailBookingApplication(input: {
  senderEmail: string;
  senderName: string;
  travelerName: string;
  route: string;
  bookingId: string;
}) {
  const url = `${getAppUrl()}/bookings/${input.bookingId}`;
  return sendEmail({
    to: input.senderEmail,
    subject: `Un voyageur a postulé — ${input.route}`,
    html: layout(
      "Candidature voyageur",
      `<p>Bonjour ${input.senderName},</p>
       <p><strong>${input.travelerName}</strong> souhaite transporter votre colis sur <strong>${input.route}</strong>.</p>
       <p><a href="${url}" style="display:inline-block;background:#28541D;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">Voir la candidature</a></p>`
    ),
  });
}

export async function emailPaymentRequested(input: {
  senderEmail: string;
  senderName: string;
  travelerName: string;
  route: string;
  bookingId: string;
  acceptedBySender?: boolean;
  amountLabel?: string;
}) {
  const url = `${getAppUrl()}/bookings/${input.bookingId}`;
  const acceptLine = input.acceptedBySender
    ? `<p>Vous avez accepté la candidature de <strong>${input.travelerName}</strong> sur <strong>${input.route}</strong>.</p>`
    : `<p><strong>${input.travelerName}</strong> a accepté votre colis sur <strong>${input.route}</strong>.</p>`;
  const amountLine = input.amountLabel
    ? `<p>Montant à payer : <strong>${input.amountLabel}</strong> (devise de votre compte).</p>`
    : "";
  return sendEmail({
    to: input.senderEmail,
    subject: `Paiement requis — ${input.route}`,
    html: layout(
      "Paiement sécurisé requis",
      `<p>Bonjour ${input.senderName},</p>
       ${acceptLine}
       ${amountLine}
       <p>Payez maintenant : les fonds restent bloqués jusqu'à la livraison.</p>
       <p><a href="${url}" style="display:inline-block;background:#28541D;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">Payer avec Stripe</a></p>`
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
       <p><a href="${url}" style="color:#28541D;">Voir la réservation</a></p>`
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
         <p><a href="${url}" style="color:#28541D;">Laisser un avis</a></p>`
      ),
    }),
    sendEmail({
      to: input.travelerEmail,
      subject: `Paiement libéré — ${input.route}`,
      html: layout(
        "Fonds libérés",
        `<p>Bonjour ${input.travelerName},</p>
         <p>La livraison est confirmée. <strong>${input.payoutLabel}</strong> est en cours de versement vers votre compte bancaire (Stripe).</p>
         <p><a href="${url}" style="color:#28541D;">Voir la réservation</a></p>`
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
       <p><a href="${input.resetUrl}" style="display:inline-block;background:#28541D;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">Choisir un nouveau mot de passe</a></p>
       <p style="font-size:13px;color:#5f6f68;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`
    ),
  });
}

export async function emailLoginOtp(input: {
  email: string;
  displayName: string;
  code: string;
  minutes: number;
}) {
  return sendEmail({
    to: input.email,
    subject: "Code de connexion Rfacto",
    html: layout(
      "Code de vérification",
      `<p>Bonjour ${input.displayName},</p>
       <p>Voici votre code pour finaliser la connexion à Rfacto :</p>
       <p style="font-size:32px;letter-spacing:0.25em;font-weight:700;text-align:center;margin:24px 0;color:#28541D;">${input.code}</p>
       <p>Ce code est valable <strong>${input.minutes} minutes</strong>. Ne le partagez avec personne.</p>
       <p style="font-size:13px;color:#5f6f68;">Si vous n'êtes pas à l'origine de cette connexion, ignorez cet email et changez votre mot de passe.</p>`
    ),
  });
}

export async function emailAmbassadorInvite(input: {
  email: string;
  displayName: string;
  agentCode: string;
  inviteUrl: string;
}) {
  return sendEmail({
    to: input.email,
    subject: "Votre code agent Héraut Réseau Rfacto",
    html: layout(
      "Vous êtes Héraut Réseau Rfacto",
      `<p>Bonjour ${input.displayName},</p>
       <p>L'équipe Rfacto vous a nommé <strong>Héraut Réseau</strong>. Voici votre code agent personnel :</p>
       <p style="font-size:28px;letter-spacing:0.12em;font-weight:700;text-align:center;margin:24px 0;color:#28541D;">${input.agentCode}</p>
       <p>Partagez ce lien d'inscription pour que les nouveaux utilisateurs soient associés à votre code :</p>
       <p><a href="${input.inviteUrl}" style="display:inline-block;background:#28541D;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">Lien d'inscription personnalisé</a></p>
       <p style="font-size:13px;color:#5f6f68;word-break:break-all;">${input.inviteUrl}</p>
       <p style="font-size:13px;color:#5f6f68;">Ne partagez ce code qu'avec les personnes que vous invitez.</p>`
    ),
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function invoiceRows(rows: { label: string; value: string }[]) {
  return `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
      ${rows
        .map(
          (r) => `<tr>
        <td style="padding:6px 0;color:#5f6f68;border-bottom:1px solid #e6ebe8;">${escapeHtml(r.label)}</td>
        <td style="padding:6px 0;text-align:right;border-bottom:1px solid #e6ebe8;"><strong>${escapeHtml(r.value)}</strong></td>
      </tr>`
        )
        .join("")}
    </table>`;
}

export async function emailServicePaymentInvoice(input: {
  clientEmail: string;
  providerEmail: string;
  clientName: string;
  providerName: string;
  title: string;
  amountLabel: string;
  tariffLabel: string;
  platformFeeLabel: string;
  stripeFeeLabel: string;
  processingDays: number;
  paymentId: string;
  payMethod?: string | null;
  escrow: boolean;
}) {
  const url = `${getAppUrl()}/service-payments/${input.paymentId}`;
  const method =
    input.payMethod === "INTERAC"
      ? "Interac e-Transfer"
      : input.payMethod === "MOBILE"
        ? "Mobile money"
        : "Carte (Stripe)";
  const rows = [
    { label: "Service", value: input.title },
    { label: "Prestataire", value: input.providerName },
    { label: "Client", value: input.clientName },
    { label: "Mode", value: method },
    { label: "Tarif prestataire", value: input.tariffLabel },
    { label: "Frais Rfacto (10 %)", value: input.platformFeeLabel },
    { label: "Frais de traitement carte", value: input.stripeFeeLabel },
    { label: "Total payé", value: input.amountLabel },
    {
      label: "Délai de traitement",
      value: `${input.processingDays} jour${input.processingDays > 1 ? "s" : ""}`,
    },
  ];
  const table = invoiceRows(rows);
  const escrowClient = input.escrow
    ? "<p>Votre paiement est sécurisé (séquestre). Le prestataire est payé après votre confirmation de livraison.</p>"
    : "";
  const escrowProvider = input.escrow
    ? "<p>Les fonds restent bloqués jusqu’à confirmation de livraison par le client.</p>"
    : "";
  const stripeNote =
    input.payMethod === "CARD" || !input.payMethod
      ? "<p style=\"font-size:13px;color:#5f6f68;\">Stripe vous envoie aussi le reçu / la facture officielle du paiement carte.</p>"
      : "";

  await Promise.all([
    sendEmail({
      to: input.clientEmail,
      subject: `Facture Rfacto — ${input.title}`,
      html: layout(
        "Facture de paiement",
        `<p>Bonjour ${escapeHtml(input.clientName)},</p>
         <p>Votre paiement de <strong>${escapeHtml(input.amountLabel)}</strong> pour <strong>${escapeHtml(input.title)}</strong> est confirmé.</p>
         ${table}
         ${escrowClient}
         ${stripeNote}
         <p><a href="${url}" style="display:inline-block;background:#28541D;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">Voir la commande</a></p>`
      ),
    }),
    sendEmail({
      to: input.providerEmail,
      subject: `Paiement reçu (séquestre) — ${input.title}`,
      html: layout(
        "Paiement client reçu",
        `<p>Bonjour ${escapeHtml(input.providerName)},</p>
         <p><strong>${escapeHtml(input.clientName)}</strong> a payé <strong>${escapeHtml(input.amountLabel)}</strong> pour <strong>${escapeHtml(input.title)}</strong>.</p>
         ${table}
         ${escrowProvider}
         <p>Votre tarif net : <strong>${escapeHtml(input.tariffLabel)}</strong>.</p>
         <p><a href="${url}" style="display:inline-block;background:#28541D;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">Voir la commande</a></p>`
      ),
    }),
  ]);
}

export async function emailServicePaymentReleased(input: {
  clientEmail: string;
  providerEmail: string;
  clientName: string;
  providerName: string;
  title: string;
  payoutLabel: string;
  paymentId: string;
  transferred: boolean;
}) {
  const url = `${getAppUrl()}/service-payments/${input.paymentId}`;
  await Promise.all([
    sendEmail({
      to: input.clientEmail,
      subject: `Livraison confirmée — ${input.title}`,
      html: layout(
        "Livraison confirmée",
        `<p>Bonjour ${escapeHtml(input.clientName)},</p>
         <p>Vous avez confirmé la livraison de <strong>${escapeHtml(input.title)}</strong>. Merci d’utiliser Rfacto.</p>
         <p><a href="${url}" style="color:#28541D;">Voir la commande</a></p>`
      ),
    }),
    sendEmail({
      to: input.providerEmail,
      subject: input.transferred
        ? `Reversement envoyé — ${input.title}`
        : `Livraison confirmée — ${input.title}`,
      html: layout(
        input.transferred ? "Fonds reversés" : "Commande clôturée",
        `<p>Bonjour ${escapeHtml(input.providerName)},</p>
         <p>Le client a confirmé la livraison de <strong>${escapeHtml(input.title)}</strong>.</p>
         <p>${
           input.transferred
             ? `<strong>${escapeHtml(input.payoutLabel)}</strong> a été envoyé vers votre compte Stripe.`
             : `Montant net : <strong>${escapeHtml(input.payoutLabel)}</strong>. Activez Stripe dans Profil si le virement n’est pas encore parti.`
         }</p>
         <p><a href="${url}" style="color:#28541D;">Voir la commande</a></p>`
      ),
    }),
  ]);
}

/** Temporary bulk invite for Google Play closed testing. */
export async function emailPlayStoreTestInvite(input: {
  email: string;
  displayName: string;
  testingUrl: string;
  storeUrl: string;
}) {
  const name = escapeHtml(input.displayName || "membre Rfacto");
  return sendEmail({
    to: input.email,
    subject: "Rfacto — testez l'application Android (Google Play)",
    html: layout(
      "Invitation de test Android",
      `<p>Bonjour ${name},</p>
       <p>L'application mobile <strong>Rfacto</strong> est disponible en <strong>test interne</strong> sur Google Play. Votre adresse doit déjà être sur la liste des testeurs.</p>
       <p><strong>Étapes (sur un téléphone Android) :</strong></p>
       <ol style="padding-left:20px;margin:12px 0;">
         <li>Ouvrez le lien d'adhésion au programme de test et acceptez.</li>
         <li>Installez Rfacto depuis Google Play.</li>
         <li>Connectez-vous avec le même compte e-mail que sur rfacto.com.</li>
       </ol>
       <p style="margin:20px 0 10px;">
         <a href="${escapeHtml(input.testingUrl)}" style="display:inline-block;background:#28541D;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:600;">1 — Devenir testeur</a>
       </p>
       <p style="margin:0 0 16px;">
         <a href="${escapeHtml(input.storeUrl)}" style="display:inline-block;background:#14201c;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:600;">2 — Ouvrir sur Play Store</a>
       </p>
       <p style="font-size:13px;color:#5f6f68;word-break:break-all;">
         Test : ${escapeHtml(input.testingUrl)}<br/>
         Store : ${escapeHtml(input.storeUrl)}
       </p>
       <p style="font-size:13px;color:#5f6f68;">Si le Play Store indique que l'app n'est pas disponible, assurez-vous d'avoir accepté le lien testeur avec le compte Google de votre téléphone.</p>`
    ),
  });
}
