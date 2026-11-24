import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: "#163D35", midnight: "#102C29", emerald: "#27866D", sage: "#A8C8B5",
        mint: "#E5F0E9", sand: "#F3EFE6", offwhite: "#F7F8F5", charcoal: "#252D2A",
        muted: "#68736D", line: "#E0E7E2", success: "#238B68", warn: "#D99A3E", danger: "#D94F4F",
      },
      fontFamily: { heading: ["var(--font-manrope)", "sans-serif"], sans: ["var(--font-inter)", "sans-serif"] },
      boxShadow: { card: "0 1px 2px rgba(16,44,41,.05), 0 4px 16px rgba(16,44,41,.05)" },
    },
  },
  plugins: [],
} satisfies Config;
