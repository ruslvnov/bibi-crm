import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth()

  const notification = await prisma.notification.findFirst({
    where: { id: params.id, userId: user.id },
  })
  if (!notification) return NextResponse.json({ success: false, code: 'NOT_FOUND' }, { status: 404 })

  await prisma.notification.update({
    where: { id: params.id },
    data: { readAt: new Date() },
  })

  return NextResponse.json({ success: true })
}
