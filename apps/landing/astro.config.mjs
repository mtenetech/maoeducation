import { defineConfig } from 'astro/config'
import tailwind from '@astrojs/tailwind'

// https://astro.build/config
export default defineConfig({
  site: 'https://auleka.com',
  integrations: [tailwind()],
  // El servidor `astro preview` (Railway) bloquea hosts desconocidos por defecto.
  // Permitimos cualquier host (sitio público de marketing), igual que la app web.
  vite: {
    preview: {
      allowedHosts: true,
    },
  },
})
