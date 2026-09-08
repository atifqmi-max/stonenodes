/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // "Stone" side of the brand — cool granite grays
        stone: {
          950: "#0b0d10",
          900: "#12151a",
          850: "#171b21",
          800: "#1c2129",
          700: "#262d38",
          600: "#374151",
          400: "#8b95a3",
          200: "#c7ccd4",
          50: "#f4f5f7"
        },
        // "Node" side of the brand — mossy signal green
        moss: {
          600: "#4f8a1f",
          500: "#6fae2b",
          400: "#8bc34a",
          300: "#a9d977"
        }
      },
      fontFamily: {
        sans: ["Sora", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"]
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(139,195,74,0.15), 0 8px 30px -12px rgba(139,195,74,0.25)"
      }
    }
  },
  plugins: []
};
