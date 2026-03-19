import { prisma } from '../../../../shared/infrastructure/database/prisma'
import { NotFoundError } from '../../../../shared/domain/errors/app.errors'
import type { CreateThreadDto, ReplyDto } from '../../application/dtos/message.dto'

export class PrismaMessageRepository {
  async listThreads(institutionId: string, userId: string) {
    const threads = await prisma.messageThread.findMany({
      where: {
        institutionId,
        OR: [
          { createdBy: userId },
          {
            messages: {
              some: {
                recipients: {
                  some: { recipientId: userId },
                },
              },
            },
          },
        ],
      },
      include: {
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                profile: { select: { firstName: true, lastName: true } },
              },
            },
            recipients: {
              where: { recipientId: userId },
              select: { isRead: true },
            },
          },
        },
        creator: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return threads
  }

  async getThread(id: string, institutionId: string, userId: string) {
    const thread = await prisma.messageThread.findFirst({
      where: { id, institutionId },
      include: {
        messages: {
          orderBy: { sentAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                profile: { select: { firstName: true, lastName: true } },
              },
            },
            recipients: {
              include: {
                recipient: {
                  select: {
                    id: true,
                    profile: { select: { firstName: true, lastName: true } },
                  },
                },
              },
            },
            attachments: {
              select: { id: true, fileName: true, storedName: true, mimeType: true, fileSize: true, createdAt: true },
            },
          },
        },
        creator: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    })

    if (!thread) {
      throw new NotFoundError('Hilo no encontrado')
    }

    // Mark messages as read
    await prisma.messageRecipient.updateMany({
      where: {
        message: { threadId: id },
        recipientId: userId,
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    })

    return thread
  }

  async createThread(institutionId: string, dto: CreateThreadDto, creatorId: string) {
    return prisma.$transaction(async (tx) => {
      const newThread = await tx.messageThread.create({
        data: {
          institutionId,
          subject: dto.subject,
          createdBy: creatorId,
        },
      })

      const message = await tx.message.create({
        data: {
          threadId: newThread.id,
          senderId: creatorId,
          body: dto.body,
          recipients: {
            create: dto.recipientIds.map((recipientId) => ({ recipientId })),
          },
        },
        select: { id: true },
      })

      return { ...newThread, firstMessageId: message.id }
    })
  }

  async reply(threadId: string, institutionId: string, dto: ReplyDto, senderId: string) {
    const thread = await prisma.messageThread.findFirst({
      where: { id: threadId, institutionId },
    })

    if (!thread) {
      throw new NotFoundError('Hilo no encontrado')
    }

    let recipientIds: string[]

    if (dto.recipientIds && dto.recipientIds.length > 0) {
      recipientIds = dto.recipientIds
    } else {
      // Get all participants from thread excluding the sender
      const existingRecipients = await prisma.messageRecipient.findMany({
        where: { message: { threadId } },
        select: { recipientId: true },
        distinct: ['recipientId'],
      })

      const participantIds = new Set(existingRecipients.map((r) => r.recipientId))

      // Add thread creator if not the sender
      if (thread.createdBy !== senderId) {
        participantIds.add(thread.createdBy)
      }

      // Remove sender from recipients
      participantIds.delete(senderId)

      recipientIds = Array.from(participantIds)
    }

    return prisma.message.create({
      data: {
        threadId,
        senderId,
        body: dto.body,
        recipients: {
          create: recipientIds.map((recipientId) => ({ recipientId })),
        },
      },
      include: {
        sender: {
          select: { id: true, profile: { select: { firstName: true, lastName: true } } },
        },
        recipients: {
          include: {
            recipient: {
              select: { id: true, profile: { select: { firstName: true, lastName: true } } },
            },
          },
        },
        attachments: {
          select: { id: true, fileName: true, storedName: true, mimeType: true, fileSize: true, createdAt: true },
        },
      },
    })
  }

  async getUnreadCount(userId: string, institutionId: string) {
    return prisma.messageRecipient.count({
      where: {
        recipientId: userId,
        isRead: false,
        message: {
          thread: { institutionId },
        },
      },
    })
  }
}
