/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./src/**/*.{astro,html,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        light: "#f8fafc", // page background (light)
        dark: "#020617", // page background (dark)

        "text-main-light": "#0f172a", // slate-900
        "text-main-dark": "#e5e7eb", // gray-200

        "accent-light": "#2563eb", // blue-600
        "accent-dark": "#60a5fa", // blue-400
      },
    },
  },
  plugins: [],
};
