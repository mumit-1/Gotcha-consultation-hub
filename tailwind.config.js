/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'neo-bg': '#FFFDF5',
        'neo-accent': '#FF6B6B',
        'neo-secondary': '#FFD93D',
        'neo-muted': '#C4B5FD',
        'neo-green': '#6EE7B7',
        'neo-black': '#000000',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neo-sm': '4px 4px 0px 0px #000',
        'neo': '6px 6px 0px 0px #000',
        'neo-md': '8px 8px 0px 0px #000',
        'neo-lg': '12px 12px 0px 0px #000',
        'neo-xl': '16px 16px 0px 0px #000',
        'neo-white': '8px 8px 0px 0px #fff',
        'neo-accent': '6px 6px 0px 0px #FF6B6B',
      },
      borderWidth: {
        '3': '3px',
      },
      keyframes: {
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'marquee': {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'slide-in': {
          from: { transform: 'translateY(-8px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'spin-slow': 'spin-slow 10s linear infinite',
        'marquee': 'marquee 30s linear infinite',
        'slide-in': 'slide-in 0.15s ease-out',
      },
      transitionDuration: {
        '100': '100ms',
      },
    },
  },
  plugins: [],
}
