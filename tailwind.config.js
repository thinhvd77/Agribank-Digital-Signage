/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./player.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Myriad Pro"', 'system-ui', 'sans-serif'],
        body: ['"Myriad Pro"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'sm': '12px',
        'md': '16px',
        'lg': '34px',
      },
      colors: {
        agribank: {
          green: '#AE1C40',
          dark: '#7A1230',
          gold: '#D4AF37',
          goldLight: '#F4E4A6',
          red: '#AE1C40',
          cream: '#FAF8F5',
        },
      },
      animation: {
        'dialog-enter': 'dialogEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'dialog-exit': 'dialogExit 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'backdrop-enter': 'backdropEnter 0.3s ease-out forwards',
        'toast-enter': 'toastEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'toast-exit': 'toastExit 0.3s ease-in forwards',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        dialogEnter: {
          '0%': { opacity: '0', transform: 'scale(0.9) translateY(20px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        dialogExit: {
          '0%': { opacity: '1', transform: 'scale(1) translateY(0)' },
          '100%': { opacity: '0', transform: 'scale(0.95) translateY(10px)' },
        },
        backdropEnter: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        toastEnter: {
          '0%': { opacity: '0', transform: 'translateX(100%) scale(0.9)' },
          '100%': { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
        toastExit: {
          '0%': { opacity: '1', transform: 'translateX(0)' },
          '100%': { opacity: '0', transform: 'translateX(100%)' },
        },
        pulseGold: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
      },
      boxShadow: {
        'dialog': '0 25px 50px -12px rgba(60, 10, 20, 0.35), 0 0 0 1px rgba(212, 175, 55, 0.1)',
        'dialog-hover': '0 35px 60px -15px rgba(60, 10, 20, 0.45), 0 0 0 1px rgba(212, 175, 55, 0.2)',
        'glow-gold': '0 0 40px -10px rgba(212, 175, 55, 0.5)',
      },
    },
  },
  plugins: [],
};
