/* eslint-disable @next/next/no-img-element */
// Logotipo VitaeGest.
//   - variant "mark" (default): isologo real (/public/isologo.png) + wordmark.
//   - variant "full": logo completo como imagen (/public/logo-full.png).
// Los PNG son transparentes, así que se ven bien en claro y oscuro.
export function Logo({
  size = 34,
  showTagline = true,
  variant = "mark",
}: {
  size?: number;
  showTagline?: boolean;
  variant?: "mark" | "full";
}) {
  if (variant === "full") {
    return (
      <img
        src="/logo-full.png"
        alt="VitaeGest · Software Kinésico Integral"
        style={{ height: size, width: "auto", display: "block" }}
      />
    );
  }

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <img
        src="/isologo.png"
        alt="VitaeGest"
        width={size}
        height={size}
        className="shrink-0"
        style={{ width: size, height: size, objectFit: "contain", display: "block" }}
      />
      <div className="leading-none min-w-0">
        <div className="font-extrabold text-[17px] tracking-tight truncate">
          <span style={{ color: "var(--ink)" }}>Vitae</span>
          <span style={{ color: "var(--coral)" }}>Gest</span>
        </div>
        {showTagline && (
          <div className="text-[9.5px] font-medium tracking-wide mt-1 truncate" style={{ color: "var(--muted)" }}>
            Software Kinésico Integral
          </div>
        )}
      </div>
    </div>
  );
}
