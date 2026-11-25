/* eslint-disable @next/next/no-img-element */
// Permanent CBAM AI logo. Files: public/logo.png (full stacked lockup), public/logo-icon.png (symbol only).
// The header version pairs the symbol with a live wordmark in the logo's navy and green so it stays legible at small sizes.
export function Logo({ light = false, size = 36 }: { light?: boolean; size?: number }) {
  const icon = <img src="/logo-icon.png" alt="" width={size} height={size} style={{ height: size, width: size }} />;
  return (
    <span className="inline-flex items-center gap-2">
      {light ? <span className="inline-flex rounded-lg bg-white p-1">{icon}</span> : icon}
      <span className="font-heading text-xl font-extrabold leading-none tracking-tight">
        <span className={light ? "text-white" : "text-[#14285B]"}>CBAM</span>{" "}
        <span className={light ? "text-[#9AD27B]" : "text-[#5BA33A]"}>AI</span>
      </span>
    </span>
  );
}

export function LogoFull({ height = 160 }: { height?: number }) {
  return <img src="/logo.png" alt="CBAM AI" style={{ height, width: "auto" }} />;
}
