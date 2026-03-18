import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "MediLink — Dossier Médical Électronique Unifié";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0D7A5F 0%, #1E293B 100%)",
          fontFamily: "Georgia, serif",
          padding: 80,
        }}
      >
        {/* Icon card */}
        <div
          style={{
            background: "white",
            borderRadius: 28,
            width: 128,
            height: 128,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 40,
            boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
          }}
        >
          <svg viewBox="0 0 24 24" width="84" height="84" fill="#0D7A5F">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>

        {/* Brand name */}
        <div
          style={{
            fontSize: 88,
            fontWeight: 700,
            color: "white",
            letterSpacing: "-2px",
            marginBottom: 16,
          }}
        >
          MediLink
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 34,
            color: "rgba(255,255,255,0.75)",
            marginBottom: 56,
            fontFamily: "system-ui, sans-serif",
            fontWeight: 400,
          }}
        >
          Dossier Médical Électronique Unifié
        </div>

        {/* Tags */}
        <div style={{ display: "flex", gap: 16 }}>
          {["Sécurisé", "Cross-établissements", "Centré patient", "Bénin"].map(
            (tag) => (
              <div
                key={tag}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: 50,
                  padding: "10px 28px",
                  color: "white",
                  fontSize: 22,
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {tag}
              </div>
            )
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
