import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { auditLog } from '@/lib/audit'
import { RequestStatus } from '@prisma/client'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireRole('OWNER', 'ADMIN')

  const request = await prisma.consultationRequest.findUnique({ where: { id: params.id } })
  if (!request) return NextResponse.json({ success: false, code: 'NOT_FOUND' }, { status: 404 })

  const terminal: RequestStatus[] = [RequestStatus.CANCELLED, RequestStatus.COMPLETED, RequestStatus.REJECTED]
  if (terminal.includes(request.status)) {
    return NextResponse.json({ success: false, code: 'INVALID_STATUS_TRANSITION' }, { status: 409 })
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updated = await tx.consultationRequest.update({
      where: { id: params.id, version: request.version },
      data: { status: RequestStatus.CANCELLED, cancelledAt: new Date(), version: { increment: 1 } },
    })
    await tx.requestStatusHistory.create({
      data: {
        consultationRequestId: params.id,
        previousStatus: request.status,
        newStatus: RequestStatus.CANCELLED,
        changedByUserId: user.id,
        source: 'ADMIN',
      },
    })
    return updated
  })

  await auditLog({ userId: user.id, action: 'CANCEL_CONSULTATION_REQUEST', entityType: 'ConsultationRequest', entityId: params.id })
  return NextResponse.json({ success: true, data: updated })
}
