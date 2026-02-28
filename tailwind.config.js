/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef7ff',
          100: '#d8edff',
          200: '#b9dfff',
          300: '#89ccff',
          400: '#52afff',
          500: '#2a8dff',
          600: '#136df5',
          700: '#0c57e1',
          800: '#1047b6',
          900: '#143f8f',
          950: '#0A0F1C',
        },
        surface: {
          0:   '#0A0F1C',
          50:  '#111827',
          100: '#1a2236',
          200: '#243049',
          300: '#2e3e5c',
        },
        mint:    '#34d399',
        coral:   '#f87171',
        amber:   '#fbbf24',
        orchid:  '#c084fc',
      },
      fontFamily: {
        display: ['"Outfit"', 'sans-serif'],
        body:    ['"DM Sans"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp:   { '0%': { opacity: 0, transform: 'translateY(16px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 } },
      }
    }
  },
  plugins: []
};
