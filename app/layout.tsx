import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MediLink — Dossier Médical Électronique Unifié",
  description: "Système DME unifié de niveau production, inspiré d'Epic Systems, du DMP français et du NHS Summary Care Record, adapté au contexte africain.",
  keywords: ["DME", "dossier médical", "santé", "Afrique", "médecin", "patient"],
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
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
