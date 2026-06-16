import webpush from 'web-push'
import { env } from '../../../config/env'
import { prisma } from '../database/prisma'

export interface PushPayload {
  title: string
  body: string
  url?: string
}

let initialized = false

function init() {
  if (initialized || !env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY)
  initialized = true
}

/** Envía una notificación push a todos los dispositivos registrados de un usuario. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  init()
  if (!initialized) return

  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  if (subs.length === 0) return

  const dead: string[] = []
  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        )
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 410 || status === 404) dead.push(s.id)
      }
    }),
  )

  if (dead.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: dead } } })
  }
}

/** Envía una notificación a todos los representantes de un estudiante. */
export async function notifyGuardiansOfStudent(
  studentId: string,
  payload: PushPayload,
): Promise<void> {
  const links = await prisma.guardianStudent.findMany({
    where: { studentId },
    select: { guardianId: true },
  })
  await Promise.allSettled(links.map((l) => sendPushToUser(l.guardianId, payload)))
}
