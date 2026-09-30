/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 50: '#f0f4f8', 100: '#d9e2ec', 200: '#bcccdc',
                300: '#9fb3c8', 400: '#829ab1', 500: '#627d98',
                600: '#486581', 700: '#334e68', 800: '#243b53', 900: '#102a43' },
        accent: { DEFAULT: '#0066CC', hover: '#0052a3', light: '#e6f0fa' },
        critical: '#DC2626', high: '#EA580C', moderate: '#CA8A04',
        emerging: '#0891B2', low: '#16A34A',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
