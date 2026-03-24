/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,tsx,jsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  corePlugins: {
    preflight: true, // We want base styles inside our shadow dom maybe? 
    // Actually if we use Shadow DOM, preflight is fine.
  }
}
