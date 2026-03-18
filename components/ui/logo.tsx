interface LogoProps {
  /** "full" shows icon + text, "icon" shows icon only */
  variant?: "full" | "icon";
  /** "dark" = white text (for dark bg), "light" = dark text (for light bg) */
  theme?: "dark" | "light";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const ICON_SIZES = { sm: 28, md: 36, lg: 48 };
const TEXT_SIZES = { sm: 16, md: 20, lg: 26 };
const SUB_SIZES  = { sm: 9,  md: 11, lg: 13 };

export function Logo({ variant = "full", theme = "dark", size = "md", className }: LogoProps) {
  const iconPx   = ICON_SIZES[size];
  const textPx   = TEXT_SIZES[size];
  const subPx    = SUB_SIZES[size];
  const textColor = theme === "dark" ? "#ffffff" : "#1E293B";
  const subColor  = theme === "dark" ? "rgba(255,255,255,0.55)" : "#64748B";
  const radius    = Math.round(iconPx * 0.22);
  const heartPx   = Math.round(iconPx * 0.58);

  return (
    <div
      className={className}
      style={{ display: "flex", alignItems: "center", gap: Math.round(iconPx * 0.28) }}
    >
      {/* Icon */}
      <div
        style={{
          width: iconPx,
          height: iconPx,
          borderRadius: radius,
          background: "#0D7A5F",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: "0 2px 8px rgba(13,122,95,0.35)",
        }}
      >
        <svg viewBox="0 0 24 24" width={heartPx} height={heartPx} fill="white">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </div>

      {/* Text */}
      {variant === "full" && (
        <div style={{ lineHeight: 1 }}>
          <div
            style={{
              color: textColor,
              fontSize: textPx,
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontWeight: 700,
              letterSpacing: "-0.3px",
            }}
          >
            MediLink
          </div>
          <div
            style={{
              color: subColor,
              fontSize: subPx,
              fontFamily: "system-ui, sans-serif",
              marginTop: 3,
              letterSpacing: "0.5px",
            }}
          >
            DME Unifié · Bénin
          </div>
        </div>
      )}
    </div>
  );
}
