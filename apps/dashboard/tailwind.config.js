/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        jobrun: {
          green: "#16A34A",
          "green-dark": "#15803D",
          "green-light": "#22C55E",
          black: "#0A0A0A",
          "grey-dark": "#1A1A1A",
          grey: "#A3A3A3",
          "grey-light": "#F5F5F5",
          white: "#FFFFFF",
          success: "#22C55E",
          warning: "#FBBF24",
          danger: "#EF4444"
        }
      },
      boxShadow: {
        card: "0 4px 20px rgba(0,0,0,0.06)",
        cardHover: "0 6px 28px rgba(0,0,0,0.12)"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};
