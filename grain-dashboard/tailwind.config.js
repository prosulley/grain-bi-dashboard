/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        earth: {
          50:  '#fdf8f0',
          100: '#f9edd8',
          200: '#f1d9ad',
          300: '#e8bf7a',
          400: '#dda04a',
          500: '#d4852a',
          600: '#c06a1f',
          700: '#9f511b',
          800: '#81411d',
          900: '#6a371a',
        },
        grain: {
          50:  '#f6f7f2',
          100: '#eaede0',
          200: '#d4dbc3',
          300: '#b5c29d',
          400: '#95a676',
          500: '#798d58',
          600: '#5e7043',
          700: '#4a5935',
          800: '#3d482d',
          900: '#343d27',
        },
        dark: {
          900: '#0f1209',
          800: '#161a0e',
          700: '#1e2414',
          600: '#28301b',
          500: '#333d22',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease forwards',
        'slide-up': 'slideUp 0.4s ease forwards',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      }
    },
  },
  plugins: [],
}
