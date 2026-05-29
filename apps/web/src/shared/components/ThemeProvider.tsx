import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth.store'

/**
 * Aplica el branding de la institución (color primario / sidebar) sobre las
 * variables CSS del theme. Los colores llegan como cadenas HSL "H S% L%".
 * Si no hay branding, restablece los valores por defecto de globals.css.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const branding = useAuthStore((s) => s.user?.institution?.branding ?? null)

  useEffect(() => {
    const root = document.documentElement

    if (branding?.primaryColor) {
      root.style.setProperty('--primary', branding.primaryColor)
      root.style.setProperty('--ring', branding.primaryColor)
    } else {
      root.style.removeProperty('--primary')
      root.style.removeProperty('--ring')
    }

    if (branding?.sidebarColor) {
      root.style.setProperty('--sidebar', branding.sidebarColor)
    } else {
      root.style.removeProperty('--sidebar')
    }
  }, [branding?.primaryColor, branding?.sidebarColor])

  return <>{children}</>
}
