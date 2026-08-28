"use client";

import { useEffect } from "react";

function openAppUrl(app: string, ticket?: string, error?: string) {
  try {
    const url = new URL(app);
    if (ticket) url.searchParams.set("ticket", ticket);
    if (error) url.searchParams.set("error", error);
    return url.toString();
  } catch {
    const join = app.includes("?") ? "&" : "?";
    if (ticket) return `${app}${join}ticket=${encodeURIComponent(ticket)}`;
    if (error) return `${app}${join}error=${encodeURIComponent(error)}`;
    return app;
  }
}

function androidIntent(openUrl: string) {
  if (!openUrl.startsWith("exp://")) return openUrl;
  const rest = openUrl.slice("exp://".length);
  return `intent://${rest}#Intent;scheme=exp;package=host.exp.exponent;end`;
}

export function OpenRfactoButton({
  app,
  ticket,
  error,
  mfa,
}: {
  app: string;
  ticket?: string;
  error?: string;
  mfa?: boolean;
}) {
  const openUrl = openAppUrl(app, ticket, error);
  const href = androidIntent(openUrl);

  useEffect(() => {
    window.location.replace(href);
  }, [href]);

  return (
    <p style={{ marginTop: 28 }}>
      <a
        href={href}
        style={{
          display: "inline-block",
          background: "#fff",
          color: "#0f6b4c",
          fontWeight: 700,
          padding: "14px 22px",
          borderRadius: 10,
          textDecoration: "none",
        }}
      >
        {mfa ? "Ouvrir Rfacto pour coller le code" : "Ouvrir Rfacto"}
      </a>
    </p>
  );
}
