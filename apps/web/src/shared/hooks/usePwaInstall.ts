import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Detectores de entorno
export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
export const isAndroid = () => /Android/.test(navigator.userAgent)
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)

export function usePwaInstall() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(() => isStandalone())

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  async function install() {
    if (!prompt) return false
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setPrompt(null)
    return outcome === 'accepted'
  }

  return {
    canInstall: !!prompt && !installed,
    isIOS: isIOS() && !installed,
    isAndroid: isAndroid() && !isIOS() && !installed,
    isInstalled: installed,
    install,
  }
}
