/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./index.tsx",
    "./App.tsx",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary-color, #003F6F)",
        secondary: "var(--secondary-color, #0D1B2A)",
        accent: "var(--accent-color, #3B82F6)",
        background: "#07121D",
        surface: "#0D1B2A",
        text: "#FFFFFF",
        textDim: "#B3B3B3",
      },
      fontFamily: {
        sans: ["Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
