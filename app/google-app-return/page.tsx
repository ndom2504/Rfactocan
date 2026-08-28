import { googleMobileErrorMessage } from "@/lib/google-mobile-oauth";
import { OpenRfactoButton } from "./open-rfacto";

export default async function GoogleAppReturnPage({
  searchParams,
}: {
  searchParams: Promise<{
    ticket?: string;
    error?: string;
    app?: string;
    mfa?: string;
  }>;
}) {
  const { ticket, error, app, mfa } = await searchParams;
  const needsCode = mfa === "1" && Boolean(ticket);
  const message = error
    ? googleMobileErrorMessage(error)
    : needsCode
      ? "Un code a été envoyé par email. Ouvrez Rfacto pour le coller."
      : ticket
        ? "Connexion réussie. Retour dans Rfacto…"
        : "Vous pouvez fermer cette fenêtre.";

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        background: "#0f6b4c",
        color: "#fff",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
      }}
    >
      <p style={{ fontSize: 20, fontWeight: 700 }}>{message}</p>
      {app ? (
        <OpenRfactoButton
          app={app}
          ticket={ticket}
          error={error}
          mfa={needsCode}
        />
      ) : (
        <p style={{ marginTop: 16, opacity: 0.85 }}>
          Revenez à Expo Go, puis réessayez Continuer avec Google.
        </p>
      )}
    </main>
  );
}
