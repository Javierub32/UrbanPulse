/** @type {import('tailwindcss').Config} */
module.exports = {
  // Apuntamos a la carpeta src basándonos en tus logs
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}"
  ],
  // Este es el preset que exige NativeWind v4
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
}