// Temporary mark. Replace the <svg> below with the final CBAM AI logo when it is selected.
export function Logo({ light = false, size = 32 }: { light?: boolean; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill={light ? "#E5F0E9" : "#163D35"} />
        <path d="M21 11.5a7 7 0 1 0 0 9" fill="none" stroke={light ? "#163D35" : "#A8C8B5"} strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="21.5" cy="16" r="2" fill="#27866D" />
      </svg>
      <span className={`font-heading text-lg font-extrabold tracking-tight ${light ? "text-white" : "text-forest"}`}>CBAM AI</span>
    </span>
  );
}
