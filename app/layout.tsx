import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const siteTitle = "Service collaboratif en ligne";
const siteDescription =
  "Service collaboratif en ligne — Rfacto connecte vendeurs, voyageurs et clients pour le commerce et l’expédition de colis.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.rfacto.com"),
  title: {
    default: siteTitle,
    template: "%s · Rfacto",
  },
  description: siteDescription,
  applicationName: "Rfacto",
  keywords: [
    "Rfacto",
    "service collaboratif en ligne",
    "services collaboratifs",
    "vente collaborative",
    "expédition de colis",
    "colis",
    "voyageurs",
    "Gabon",
    "livraison",
  ],
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: ["/favicon.svg"],
    apple: [{ url: "/favicon.svg" }],
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://www.rfacto.com",
    siteName: "Rfacto",
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        // Cache-bust filename — WhatsApp/Facebook keep old OG previews for a long time.
        url: "https://www.rfacto.com/og-communaute.jpg",
        secureUrl: "https://www.rfacto.com/og-communaute.jpg",
        type: "image/jpeg",
        width: 1200,
        height: 675,
        alt: siteTitle,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["https://www.rfacto.com/og-communaute.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${display.variable} ${body.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
