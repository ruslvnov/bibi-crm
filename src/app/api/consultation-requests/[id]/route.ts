import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth, requireRole } from '@/lib/auth'
import { RequestStatus } from '@prisma/client'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireRole('OWNER', 'ADMIN')
  const body = await req.json()

  const request = await prisma.consultationRequest.findUnique({ where: { id: params.id } })
  if (!request) return NextResponse.json({ success: false, code: 'NOT_FOUND' }, { status: 404 })

  // Status change
  if (body.status !== undefined) {
    if (!Object.values(RequestStatus).includes(body.status)) {
      return NextResponse.json({ success: false, code: 'INVALID_STATUS' }, { status: 400 })
    }
    const updated = await prisma.$transaction(async (tx) => {
      const updated = await tx.consultationRequest.update({
        where: { id: params.id },
        data: { status: body.status, version: { increment: 1 } },
      })
      await tx.requestStatusHistory.create({
        data: { consultationRequestId: params.id, previousStatus: request.status, newStatus: body.status, changedByUserId: user.id, source: 'ADMIN' },
      })
      return updated
    })
    return NextResponse.json({ success: true, data: updated })
  }

  // Field edit
  const { service, complaint, preferredDate, preferredTime } = body
  const updateData: Record<string, unknown> = {}
  if (service) updateData.service = service
  if (complaint !== undefined) updateData.complaint = complaint
  if (preferredDate) updateData.preferredDate = preferredDate
  if (preferredTime) updateData.preferredTime = preferredTime
  if (preferredDate && preferredTime) {
    const { fromZonedTime } = await import('date-fns-tz')
    updateData.preferredDateTime = fromZonedTime(`${preferredDate}T${preferredTime}:00`, 'Asia/Bishkek')
  }

  const updated = await prisma.consultationRequest.update({ where: { id: params.id }, data: updateData })
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireRole('OWNER', 'ADMIN')

  const request = await prisma.consultationRequest.findUnique({ where: { id: params.id } })
  if (!request) return NextResponse.json({ success: false, code: 'NOT_FOUND' }, { status: 404 })

  await prisma.$transaction([
    prisma.requestStatusHistory.deleteMany({ where: { consultationRequestId: params.id } }),
    prisma.whatsAppMessageLog.deleteMany({ where: { consultationRequestId: params.id } }),
    prisma.consultationRequest.delete({ where: { id: params.id } }),
  ])

  return NextResponse.json({ success: true })
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireAuth()

  const request = await prisma.consultationRequest.findUnique({
    where: { id: params.id },
    include: {
      patient: true,
      assignedAdmin: { select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true } },
      statusHistory: { orderBy: { createdAt: 'asc' }, include: { changedBy: { select: { id: true, name: true } } } },
      messageLogs: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!request) return NextResponse.json({ success: false, code: 'NOT_FOUND' }, { status: 404 })
  return NextResponse.json({ success: true, data: request })
}
