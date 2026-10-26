import type { Config } from "tailwindcss";

// Cores via variável CSS (canais "r g b") para o tema "graphite" da home poder
// redefini-las num escopo (.graphite em globals.css) sem mexer nos componentes.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // superfícies
        ink: {
          950: v("ink-950"),
          900: v("ink-900"),
          800: v("ink-800"),
          700: v("ink-700"),
        },
        neutral: {
          50: v("n-50"),
          100: v("n-100"),
          200: v("n-200"),
          300: v("n-300"),
          400: v("n-400"),
          500: v("n-500"),
          600: v("n-600"),
          700: v("n-700"),
        },
        accent: {
          DEFAULT: v("accent"),
          soft: v("accent-soft"),
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
