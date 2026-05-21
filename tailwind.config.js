/** @type {import('tailwindcss').Config} */
module.exports = {
  // IMPORTANTE: darkMode debe estar antes de content para NativeWind v4
  darkMode: 'class',
  content: [
    './App.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#EEF2FF', 500: '#6366F1', 600: '#4F46E5' },
      },
    },
  },
  plugins: [],
};
