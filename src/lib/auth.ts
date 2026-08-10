import { getSession } from './session'
import { prisma } from './db'
import type { SafeUser } from '@/types'
import { UserRole } from '@prisma/client'

export async function getCurrentUser(): Promise<SafeUser | null> {
  const session = await getSession()
  if (!session.userId) return null

  const user = await prisma.user.findUnique({
    where: { id: session.userId, isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return user
}

export async function requireAuth(): Promise<SafeUser> {
  const user = await getCurrentUser()
  if (!user) throw new AuthError('Unauthorized', 401)
  return user
}

export async function requireRole(...roles: UserRole[]): Promise<SafeUser> {
  const user = await requireAuth()
  if (!roles.includes(user.role)) throw new AuthError('Forbidden', 403)
  return user
}

export function canManageRequests(role: UserRole): boolean {
  return role === UserRole.OWNER || role === UserRole.ADMIN
}

export function canManageUsers(role: UserRole): boolean {
  return role === UserRole.OWNER
}

export function canViewSettings(role: UserRole): boolean {
  return role === UserRole.OWNER
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message)
    this.name = 'AuthError'
  }
}
