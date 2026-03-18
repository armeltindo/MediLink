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
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
