import { UserRole } from '@prisma/client'

export function canManageRequests(role: string): boolean {
  return role === UserRole.OWNER || role === UserRole.ADMIN
}

export function canManageUsers(role: string): boolean {
  return role === UserRole.OWNER
}
