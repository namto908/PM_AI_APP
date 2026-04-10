/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#6366f1",
        secondary: "#a855f7",
        background: "#0f172a",
        surface: "#1e293b",
        accent: "#22d3ee",
      },
    },
  },
  plugins: [],
}
