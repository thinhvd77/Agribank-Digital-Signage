/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./player.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        agribank: {
          green: '#00723F',
          gold: '#FFD700',
        },
      },
    },
  },
  plugins: [],
};
