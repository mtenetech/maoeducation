/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        // Marca Auleka
        brand: {
          blue: '#2563EB',
          'blue-dark': '#1D4ED8',
          green: '#16A34A',
          'green-dark': '#15803D',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #2563EB 0%, #16A34A 100%)',
      },
    },
  },
  plugins: [],
}
