import type { Config } from "tailwindcss";

// Paleta oficial VitaeGest mapeada a variables CSS (ver src/app/globals.css).
// Esmeralda #117864 · Teal #1ABC9C · Gris Pizarra #455A64 · Salmón #F1948A
const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        line: "var(--border)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        primary: { DEFAULT: "var(--primary)", soft: "var(--primary-soft)", ink: "var(--primary-ink)" },
        teal: { DEFAULT: "var(--teal)", soft: "var(--teal-soft)", ink: "var(--teal-ink)" },
        esmeralda: { DEFAULT: "var(--emerald)", soft: "var(--emerald-soft)", ink: "var(--emerald-ink)" },
        coral: { DEFAULT: "var(--coral)", soft: "var(--coral-soft)", ink: "var(--coral-ink)" },
        amber: { DEFAULT: "var(--amber)", soft: "var(--amber-soft)" },
        rose: { DEFAULT: "var(--rose)", soft: "var(--rose-soft)" },
        plum: { DEFAULT: "var(--plum)", soft: "var(--plum-soft)" },
      },
      fontFamily: {
        display: ["var(--font-inter)", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: { xl2: "14px", xl3: "18px" },
      boxShadow: { soft: "var(--shadow)", lg2: "var(--shadow-lg)" },
    },
  },
  plugins: [],
};

export default config;
