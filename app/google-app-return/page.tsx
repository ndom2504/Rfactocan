import { googleMobileErrorMessage } from "@/lib/google-mobile-oauth";

export default async function GoogleAppReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string; error?: string }>;
}) {
  const { ticket, error } = await searchParams;
  const message = error
    ? googleMobileErrorMessage(error)
    : ticket
      ? "Connexion réussie. Retour dans l'app…"
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
      <p style={{ fontSize: 18, fontWeight: 600 }}>{message}</p>
      <p style={{ marginTop: 12, opacity: 0.85 }}>
        Vous pouvez fermer cette fenêtre.
      </p>
    </main>
  );
}
