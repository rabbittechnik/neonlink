/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      keyframes: {
        "neonlink-bell": {
          "0%, 100%": {
            opacity: "1",
            filter: "drop-shadow(0 0 4px rgba(34,211,238,0.45))",
            transform: "scale(1)",
          },
          "50%": {
            opacity: "0.88",
            filter: "drop-shadow(0 0 14px rgba(34,211,238,0.9))",
            transform: "scale(1.06)",
          },
        },
      },
      animation: {
        "neonlink-bell": "neonlink-bell 1.25s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
