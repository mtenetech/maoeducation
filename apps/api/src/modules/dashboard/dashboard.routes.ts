import { FastifyInstance } from 'fastify'
import { prisma } from '../../shared/infrastructure/database/prisma'
import { authMiddleware } from '../../shared/infrastructure/middleware/auth.middleware'

export default async function dashboardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  app.get('/dashboard/stats', async (req) => {
    const { institutionId } = req.user

    const [
      totalUsers,
      totalStudents,
      totalTeachers,
      activeYear,
      totalParallels,
      totalActivities,
      pendingIncidents,
      unreadMessages,
    ] = await Promise.all([
      prisma.user.count({ where: { institutionId, isActive: true } }),
      prisma.userRole.count({
        where: { user: { institutionId }, role: { name: 'student', institutionId } },
      }),
      prisma.userRole.count({
        where: { user: { institutionId }, role: { name: 'teacher', institutionId } },
      }),
      prisma.academicYear.findFirst({
        where: { institutionId, isActive: true },
        include: {
          _count: { select: { academicPeriods: true, parallels: true, enrollments: true } },
        },
      }),
      prisma.parallel.count({ where: { institutionId } }),
      prisma.activity.count({ where: { institutionId } }),
      prisma.disciplinaryIncident.count({
        where: { institutionId, status: { in: ['open', 'in_review'] } },
      }),
      prisma.messageRecipient.count({
        where: { recipientId: req.user.sub, isRead: false, message: { thread: { institutionId } } },
      }),
    ])

    return {
      users: { total: totalUsers, students: totalStudents, teachers: totalTeachers },
      academic: {
        activeYear: activeYear
          ? {
              id: activeYear.id,
              name: activeYear.name,
              periods: activeYear._count.academicPeriods,
              parallels: activeYear._count.parallels,
              enrollments: activeYear._count.enrollments,
            }
          : null,
        totalParallels,
        totalActivities,
      },
      incidents: { pending: pendingIncidents },
      messages: { unread: unreadMessages },
    }
  })
}
