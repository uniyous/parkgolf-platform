/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'golf-primary': '#10b981',
        'golf-secondary': '#059669',
        'golf-light': '#6ee7b7',
        'golf-dark': '#047857',
      },
    },
  },
  plugins: [],
}