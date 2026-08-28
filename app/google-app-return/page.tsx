import { googleMobileErrorMessage } from "@/lib/google-mobile-oauth";

export default async function GoogleAppReturnPage({
  searchParams,
}: {
  searchParams: Promise<{
    ticket?: string;
    error?: string;
    ok?: string;
    mfa?: string;
  }>;
}) {
  const { error, mfa } = await searchParams;
  const message = error
    ? googleMobileErrorMessage(error)
    : mfa === "1"
      ? "Un code a été envoyé par email. Revenez dans Rfacto pour le coller."
      : "Connexion Google réussie. Revenez dans Rfacto — ça se termine tout seul.";

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
      <p style={{ fontSize: 22, fontWeight: 700, maxWidth: 360 }}>{message}</p>
      <p style={{ marginTop: 18, opacity: 0.9, maxWidth: 360, lineHeight: 1.45 }}>
        Fermez cet onglet et ouvrez Expo Go. Ne touchez plus à Continuer avec
        Google.
      </p>
    </main>
  );
}
