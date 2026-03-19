import { FastifyInstance } from 'fastify'

export async function registerRoutes(app: FastifyInstance) {
  app.register(import('../../modules/auth/presentation/auth.routes'), { prefix: '/api/v1' })
  app.register(import('../../modules/users/presentation/user.routes'), { prefix: '/api/v1' })
  app.register(import('../../modules/academic/presentation/academic.routes'), { prefix: '/api/v1' })
  app.register(import('../../modules/enrollment/presentation/enrollment.routes'), { prefix: '/api/v1' })
  app.register(import('../../modules/activities/presentation/activity.routes'), { prefix: '/api/v1' })
  app.register(import('../../modules/attendance/presentation/attendance.routes'), { prefix: '/api/v1' })
  app.register(import('../../modules/incidents/presentation/incident.routes'), { prefix: '/api/v1' })
  app.register(import('../../modules/schedules/presentation/schedule.routes'), { prefix: '/api/v1' })
  app.register(import('../../modules/messaging/presentation/message.routes'), { prefix: '/api/v1' })

  app.register(import('../../modules/tasks/presentation/task.routes'), { prefix: '/api/v1' })
  app.register(import('../../modules/reports/presentation/report.routes'), { prefix: '/api/v1' })
  app.register(import('../../modules/dashboard/dashboard.routes'), { prefix: '/api/v1' })

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))
}
