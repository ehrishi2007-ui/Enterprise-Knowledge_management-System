/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'slate-850': '#172033',
        'orange-accent': '#f97316',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      width: {
        'sidebar': '240px',
        'sidebar-collapsed': '64px',
      }
    },
  },
  plugins: [],
}
