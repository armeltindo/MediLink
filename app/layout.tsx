import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MediLink — DME Unifié Bénin",
    template: "%s — MediLink",
  },
  description:
    "Système de Dossier Médical Électronique unifié pour les établissements de santé au Bénin. Sécurisé, cross-établissements, centré patient.",
  keywords: [
    "DME", "dossier médical électronique", "santé", "Bénin", "Afrique",
    "médecin", "patient", "hôpital", "MediLink",
  ],
  applicationName: "MediLink",
  authors: [{ name: "MediLink" }],
  creator: "MediLink",
  metadataBase: new URL("https://medilink.bj"),
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "MediLink",
    title: "MediLink — Dossier Médical Électronique Unifié",
    description:
      "Système DME unifié pour les établissements de santé au Bénin. Sécurisé, cross-établissements, centré patient.",
  },
  twitter: {
    card: "summary_large_image",
    title: "MediLink — DME Unifié Bénin",
    description: "Système DME unifié pour les établissements de santé au Bénin.",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    apple: "/apple-icon",
    shortcut: "/favicon.svg",
  },
  robots: {
    index: false,
    follow: false,
  },
  themeColor: "#1E3A5F",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <meta name="color-scheme" content="light" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
