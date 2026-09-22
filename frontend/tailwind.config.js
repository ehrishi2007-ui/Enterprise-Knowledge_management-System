/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#11172a',
          50: '#e8eaf0',
          100: '#c5c9d6',
          200: '#9ea4ba',
          300: '#77809e',
          400: '#596489',
          500: '#3b4974',
          600: '#333f65',
          700: '#283251',
          800: '#1e263e',
          900: '#11172a',
          950: '#0a0e1a',
        },
        slate2: {
          DEFAULT: '#626c7d',
          light: '#8a92a1',
          dark: '#4a5262',
        },
        teal: {
          DEFAULT: '#599692',
          50: '#e8f0ef',
          100: '#d1e1df',
          200: '#a3c3c0',
          300: '#75a5a0',
          400: '#599692',
          500: '#4a837f',
          600: '#3d6c69',
          700: '#305553',
          800: '#233e3d',
          900: '#162726',
        },
        ice: {
          DEFAULT: '#dfe5ec',
          50: '#f8fafb',
          100: '#f0f3f7',
          200: '#dfe5ec',
          300: '#c8d1dc',
          400: '#b1bdcc',
        },
        dark: {
          DEFAULT: '#1A1A1A',
          50: '#2A2A2A',
          100: '#252525',
          200: '#1A1A1A',
          300: '#151515',
          400: '#0F0F0F',
        },
      },
    },
  },
  plugins: [],
}
