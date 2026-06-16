import { useState, useEffect } from 'react'
import { apiPost, apiGet } from '@/shared/lib/api-client'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

type PushState = 'unsupported' | 'default' | 'granted' | 'denied'

export function usePushNotifications() {
  const [state, setState] = useState<PushState>('default')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported')
      return
    }
    setState(Notification.permission === 'granted' ? 'granted' : Notification.permission === 'denied' ? 'denied' : 'default')
  }, [])

  async function subscribe() {
    if (state !== 'default') return
    setLoading(true)
    try {
      const { publicKey } = await apiGet<{ publicKey: string | null }>('push/vapid-public-key')
      if (!publicKey) return

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setState('denied'); return }

      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      if (existing) await existing.unsubscribe()

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      const json = sub.toJSON()
      await apiPost('push/subscribe', {
        endpoint: sub.endpoint,
        keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
      })

      setState('granted')
    } catch {
      // usuario canceló o error de red
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribe() {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      if (sub) {
        await apiPost('push/subscribe', { endpoint: sub.endpoint }) // delete via DELETE
        await sub.unsubscribe()
      }
      setState('default')
    } finally {
      setLoading(false)
    }
  }

  return { state, loading, subscribe, unsubscribe }
}
