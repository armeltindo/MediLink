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
          background: "linear-gradient(135deg, #0f1f38 0%, #1E3A5F 50%, #0f2a1e 100%)",
          fontFamily: "Georgia, serif",
          padding: 80,
        }}
      >
        {/* Icon card — bouclier */}
        <div
          style={{
            background: "#F1F5F9",
            borderRadius: 32,
            width: 148,
            height: 148,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 44,
            boxShadow: "0 28px 72px rgba(0,0,0,0.45)",
          }}
        >
          <svg viewBox="0 0 148 148" width="148" height="148">
            {/* Bouclier */}
            <path
              d="M74 14 L122 34 L122 82 Q122 116 74 134 Q26 116 26 82 L26 34 Z"
              fill="#1E3A5F"
            />
            {/* ECG */}
            <path
              d="M30 82 L40 82 L46 66 L52 98 L58 72 L64 82 L78 82"
              stroke="#60A5FA"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Réseau */}
            <path d="M88 58 L100 50" stroke="#60A5FA" strokeWidth="1.2" fill="none" strokeOpacity="0.6"/>
            <path d="M100 50 L110 60" stroke="#60A5FA" strokeWidth="1.2" fill="none" strokeOpacity="0.6"/>
            <path d="M110 60 L104 72" stroke="#60A5FA" strokeWidth="1.2" fill="none" strokeOpacity="0.6"/>
            <path d="M88 58 L104 72" stroke="#60A5FA" strokeWidth="1.2" fill="none" strokeOpacity="0.5"/>
            <circle cx="88"  cy="58" r="3.2" fill="#60A5FA" fillOpacity="0.85"/>
            <circle cx="100" cy="50" r="2.8" fill="#60A5FA" fillOpacity="0.75"/>
            <circle cx="110" cy="60" r="2.8" fill="#60A5FA" fillOpacity="0.75"/>
            <circle cx="104" cy="72" r="3.2" fill="#60A5FA" fillOpacity="0.85"/>
            {/* Bâton */}
            <path d="M74 36 L74 112" stroke="white" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
            {/* Ailettes */}
            <path d="M74 42 Q61 36 58 42 Q61 48 74 46 Z" fill="white" fillOpacity="0.95"/>
            <path d="M74 42 Q87 36 90 42 Q87 48 74 46 Z" fill="white" fillOpacity="0.95"/>
            {/* Serpent gauche */}
            <path
              d="M74 52 Q66 58 74 66 Q82 74 74 82 Q66 90 74 98 Q79 104 74 110"
              stroke="white" strokeWidth="2.4" strokeLinecap="round" fill="none"
            />
            {/* Serpent droit */}
            <path
              d="M74 52 Q82 58 74 66 Q66 74 74 82 Q82 90 74 98 Q69 104 74 110"
              stroke="white" strokeWidth="2.4" strokeLinecap="round" fill="none"
            />
            <circle cx="74" cy="111" r="3" fill="white" fillOpacity="0.8"/>
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
            color: "rgba(255,255,255,0.70)",
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
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.25)",
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
