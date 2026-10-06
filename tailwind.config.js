/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          base: '#09080F',
          surface: '#13111C',
          elevated: '#1D1A2B',
          glass: 'rgba(23, 20, 36, 0.75)',
        },
        accent: {
          purple: '#9333EA',
          pink: '#EC4899',
          violet: '#7C3AED',
          cyan: '#06B6D4',
        },
        subtext: '#9894AB',
      },
      boxShadow: {
        'glow-purple': '0 0 25px -5px rgba(147, 51, 234, 0.45)',
        'glow-pink': '0 0 25px -5px rgba(236, 72, 153, 0.45)',
      },
    },
  },
  plugins: [],
}