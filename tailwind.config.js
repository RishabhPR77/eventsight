/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#FBF8F3",
        sand: "#F3EEE5",
        line: "#E7E1D6",
        ink: { DEFAULT: "#132B2C", soft: "#465B5C", faint: "#667978" },
        brand: { DEFAULT: "#0F4C4F", strong: "#0A3638", soft: "#E3F0EE" },
        marigold: { DEFAULT: "#F2A31B", strong: "#C97F06", soft: "#FDF0D5" },
        good: { DEFAULT: "#1C7C54", soft: "#E2F3EA" },
        warn: { DEFAULT: "#A9620B", soft: "#FCF0DC" },
        bad: { DEFAULT: "#BE3A2B", soft: "#FBE7E4" },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', "system-ui", "sans-serif"],
        sans: ['"Figtree Variable"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(19,43,44,.05), 0 4px 16px rgba(19,43,44,.05)",
        lift: "0 2px 4px rgba(19,43,44,.06), 0 12px 32px rgba(19,43,44,.10)",
      },
      keyframes: {
        rise: { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "none" } },
      },
      animation: { rise: "rise .25s ease-out both" },
    },
  },
  plugins: [],
}
