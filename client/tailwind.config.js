/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0070BA', // PayPal Blue
          dark: '#003087',
          light: '#009CDE',
        },
        paypal: {
          blue: '#003087',
          lightBlue: '#0070BA',
          gold: '#FFC439',
          darkGold: '#F29900',
        },
        surface: {
          DEFAULT: '#0F172A',
          card: '#1E293B',
          container: '#0B1120',
          border: '#334155',
          hover: '#2D3B4F',
        },
        accent: {
          emerald: '#10B981',
          cyan: '#06B6D4',
          amber: '#F59E0B',
          purple: '#8B5CF6',
          rose: '#F43F5E',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px -5px rgba(0, 112, 186, 0.4)',
        'glow-emerald': '0 0 20px -5px rgba(16, 185, 129, 0.4)',
      },
    },
  },
  plugins: [],
};
