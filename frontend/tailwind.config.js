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
        // Dark Olive Gray Brand Palette (from user image #3d3c2a)
        olive: {
          DEFAULT: '#3d3c2a',
          50: '#f5f4ee',
          100: '#e8e6dc',
          200: '#d3cfbe',
          300: '#b8b298',
          400: '#948d6f',
          500: '#6f694e',
          600: '#524e38',
          700: '#3d3c2a', // Exact user Dark Olive Gray
          800: '#2b2a1d',
          900: '#1c1b14',
          950: '#12120d',
        },
        // Warm Stone Brand Palette (from user image #e0d8cd)
        stone: {
          DEFAULT: '#e0d8cd',
          50: '#fbfaf8',
          100: '#f5f1eb',
          200: '#eae4db',
          300: '#e0d8cd', // Exact user Warm Stone
          400: '#c5bbae',
          500: '#aba091',
          600: '#8c8273',
          700: '#6c6457',
          800: '#4c463d',
          900: '#2d2924',
          950: '#1a1815',
        },
        // Mapped navy to Dark Olive Gray family for sidebars & deep containers
        navy: {
          DEFAULT: '#1a1914',
          50: '#f4f2e6',
          100: '#dedbc4',
          200: '#b5af89',
          300: '#918b66',
          400: '#6e6a4c',
          500: '#4f4d36',
          600: '#3d3c2a', // Exact Dark Olive Gray
          700: '#313025',
          800: '#25241d',
          900: '#1a1914',
          950: '#12110d',
        },
        // Mapped teal to Warm Olive Stone accent family (high contrast with text-white)
        teal: {
          DEFAULT: '#5e593c',
          50: '#f7f5ee',
          100: '#ede8db',
          200: '#ded4c0',
          300: '#c9bda1',
          400: '#9c9271',
          500: '#524d34',
          600: '#46422c',
          700: '#3a3724',
          800: '#2e2c1c',
          900: '#1f1e13',
        },
        // Neutralized blue to architectural stone slate so no accidental sky/cyan blue appears
        blue: {
          DEFAULT: '#5a665a',
          50: '#f4f6f4',
          100: '#e5eae5',
          200: '#cdd5cd',
          300: '#afbcaf',
          400: '#8f9f8f',
          500: '#738373',
          600: '#5a665a',
          700: '#455045',
          800: '#323a32',
          900: '#212721',
        },
        // Neutralized cyan to sage stone
        cyan: {
          DEFAULT: '#5a665a',
          50: '#f4f6f4',
          100: '#e5eae5',
          200: '#cdd5cd',
          300: '#afbcaf',
          400: '#8f9f8f',
          500: '#738373',
          600: '#5a665a',
          700: '#455045',
          800: '#323a32',
          900: '#212721',
        },
        // Neutralized purple to warm umber stone
        purple: {
          DEFAULT: '#6b5b54',
          50: '#f8f6f5',
          100: '#ede7e5',
          200: '#ded5d1',
          300: '#cbbfb9',
          400: '#b4a39b',
          500: '#948178',
          600: '#78665e',
          700: '#60514a',
          800: '#493d38',
          900: '#312925',
        },
        // Mapped ice to Warm Stone tints for typography and surfaces
        ice: {
          DEFAULT: '#e0d8cd',
          50: '#faf8f5',
          100: '#f4f0e9',
          200: '#e0d8cd', // Exact Warm Stone
          300: '#cec4b5',
          400: '#b5a998',
        },
        // Mapped slate2 to warm stone slate
        slate2: {
          DEFAULT: '#8e8778',
          light: '#b0a898',
          dark: '#5e584d',
        },
        // Mapped dark to velvety dark olive charcoal
        dark: {
          DEFAULT: '#14140f',
          50: '#28271e',
          100: '#212019',
          200: '#1a1914',
          300: '#14140f',
          400: '#0e0d0a',
        },
      },
    },
  },
  plugins: [],
}
