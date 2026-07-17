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

export const metadata: Metadata = {
  metadataBase: new URL("https://www.rfacto.com"),
  title: {
    default: "Rfacto — Transport collaboratif de colis",
    template: "%s · Rfacto",
  },
  description:
    "Envoyez vos colis plus simplement, plus rapidement et à moindre coût. Mise en relation entre expéditeurs et voyageurs, paiement sécurisé et suivi des livraisons.",
  applicationName: "Rfacto",
  keywords: [
    "Rfacto",
    "transport collaboratif",
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
    title: "Rfacto — Transport collaboratif de colis",
    description:
      "Envoyez vos colis plus simplement, plus rapidement et à moindre coût grâce à la communauté Rfacto. Paiement sécurisé et suivi des livraisons.",
    images: [
      {
        url: "/og-rfacto.png",
        width: 1200,
        height: 675,
        alt: "Rfacto — Transport collaboratif de colis",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rfacto — Transport collaboratif de colis",
    description:
      "Mise en relation expéditeurs et voyageurs. Paiement sécurisé. Suivi des livraisons.",
    images: ["/og-rfacto.png"],
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
