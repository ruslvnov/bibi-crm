import { prisma } from './db'

interface AuditParams {
  userId?: string
  action: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export async function auditLog(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({ data: params })
  } catch {
    // Never throw — audit failures must not break business logic
  }
}

export async function notifyAdmins(params: {
  type: string
  title: string
  message: string
  entityId?: string
}): Promise<void> {
  try {
    const admins = await prisma.user.findMany({
      where: { isActive: true, role: { in: ['OWNER', 'ADMIN'] } },
      select: { id: true },
    })
    await prisma.notification.createMany({
      data: admins.map((a) => ({ ...params, userId: a.id })),
    })
  } catch {
    // Non-fatal
  }
}
