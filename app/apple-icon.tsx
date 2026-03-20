import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F1F5F9",
          borderRadius: 40,
        }}
      >
        <svg viewBox="0 0 180 180" width="180" height="180">
          {/* Bouclier navy */}
          <path
            d="M90 18 L148 42 L148 100 Q148 140 90 162 Q32 140 32 100 L32 42 Z"
            fill="#1E3A5F"
          />

          {/* Ligne ECG (gauche) */}
          <path
            d="M32 100 M38 100 L50 100 L56 82 L62 118 L68 88 L74 100 L90 100"
            stroke="#60A5FA"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Réseau numérique (droite) */}
          <path d="M108 72 L122 62" stroke="#60A5FA" strokeWidth="1.4" fill="none" strokeOpacity="0.6"/>
          <path d="M122 62 L134 74" stroke="#60A5FA" strokeWidth="1.4" fill="none" strokeOpacity="0.6"/>
          <path d="M134 74 L126 88" stroke="#60A5FA" strokeWidth="1.4" fill="none" strokeOpacity="0.6"/>
          <path d="M108 72 L126 88" stroke="#60A5FA" strokeWidth="1.4" fill="none" strokeOpacity="0.5"/>
          <circle cx="108" cy="72"  r="4" fill="#60A5FA" fillOpacity="0.85"/>
          <circle cx="122" cy="62"  r="3.5" fill="#60A5FA" fillOpacity="0.75"/>
          <circle cx="134" cy="74"  r="3.5" fill="#60A5FA" fillOpacity="0.75"/>
          <circle cx="126" cy="88"  r="4" fill="#60A5FA" fillOpacity="0.85"/>

          {/* Bâton */}
          <path
            d="M90 46 L90 138"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />

          {/* Ailettes */}
          <path d="M90 52 Q74 44 70 52 Q74 60 90 56 Z" fill="white" fillOpacity="0.95"/>
          <path d="M90 52 Q106 44 110 52 Q106 60 90 56 Z" fill="white" fillOpacity="0.95"/>

          {/* Globe */}
          <path
            d="M83 48 Q90 44 97 48 Q90 52 83 48 Z"
            stroke="white"
            strokeWidth="1.8"
            fill="none"
          />

          {/* Serpent gauche */}
          <path
            d="M90 64 Q80 72 90 82 Q100 92 90 102 Q80 112 90 122 Q96 128 90 134"
            stroke="white"
            strokeWidth="2.8"
            strokeLinecap="round"
            fill="none"
          />

          {/* Serpent droit */}
          <path
            d="M90 64 Q100 72 90 82 Q80 92 90 102 Q100 112 90 122 Q84 128 90 134"
            stroke="white"
            strokeWidth="2.8"
            strokeLinecap="round"
            fill="none"
          />

          {/* Pointe bâton */}
          <circle cx="90" cy="136" r="3.5" fill="white" fillOpacity="0.8"/>
        </svg>
      </div>
    ),
    { ...size }
  );
}
