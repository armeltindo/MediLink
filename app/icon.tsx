import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1E3A5F",
          borderRadius: 7,
        }}
      >
        <svg viewBox="0 0 32 32" width="26" height="26">
          {/* Bouclier */}
          <path
            d="M16 3 L27 7.5 L27 16.5 Q27 24 16 29 Q5 24 5 16.5 L5 7.5 Z"
            fill="white"
            fillOpacity="0.15"
          />
          {/* Bâton */}
          <path
            d="M16 8 L16 25"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          {/* Ailette gauche */}
          <path d="M16 9.5 Q11 7 10 10.5 Q11 13 16 11.5 Z" fill="white" />
          {/* Ailette droite */}
          <path d="M16 9.5 Q21 7 22 10.5 Q21 13 16 11.5 Z" fill="white" />
          {/* Serpent gauche */}
          <path
            d="M16 13 Q12.5 15.5 16 18 Q19.5 20.5 16 23"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
          {/* Serpent droit */}
          <path
            d="M16 13 Q19.5 15.5 16 18 Q12.5 20.5 16 23"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
