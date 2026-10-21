/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        peymen: {
          bg: "#f3f6fc",
          card: "#ffffff",
          sidebar: "#fbfcfe",
          primary: "#1a56db",
          darkNavy: "#0a1931",
          border: "#e5edf8"
        }
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"]
      },
      boxShadow: {
        soft: "0 10px 30px -5px rgba(10, 25, 49, 0.04), 0 4px 10px -2px rgba(10, 25, 49, 0.02)",
        card: "0 14px 35px -8px rgba(15, 30, 65, 0.06), 0 2px 6px -1px rgba(15, 30, 65, 0.02)",
        blueGlow: "0 10px 25px -4px rgba(37, 99, 235, 0.35)"
      }
    },
  },
  plugins: [],
}
