/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0284c7', // Professional medical blue
          600: '#0369a1',
          700: '#075985',
        },
        tealbrand: {
          500: '#0d9488', // Calming teal
          600: '#0f766e',
        }
      }
    },
  },
  plugins: [],
}
