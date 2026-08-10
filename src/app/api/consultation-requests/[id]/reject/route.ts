import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { sendRejectionMessage } from '@/lib/ycloud'
import { buildRejectionMessage } from '@/lib/messages'
import { auditLog } from '@/lib/audit'
import { RequestStatus, MessageDirection, MessageStatus } from '@prisma/client'

const BodySchema = z.object({
  reason: z.string().min(1),
  sendMessage: z.boolean().default(true),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireRole('OWNER', 'ADMIN')

  const body = await req.json().catch(() => ({}))
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, code: 'VALIDATION_ERROR', errors: parsed.error.errors }, { status: 422 })
  }

  const request = await prisma.consultationRequest.findUnique({
    where: { id: params.id },
    include: { patient: true },
  })
  if (!request) return NextResponse.json({ success: false, code: 'NOT_FOUND' }, { status: 404 })

  const terminal: RequestStatus[] = [RequestStatus.REJECTED, RequestStatus.CANCELLED, RequestStatus.COMPLETED]
  if (terminal.includes(request.status)) {
    return NextResponse.json({ success: false, code: 'INVALID_STATUS_TRANSITION' }, { status: 409 })
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updated = await tx.consultationRequest.update({
      where: { id: params.id, version: request.version },
      data: {
        status: RequestStatus.REJECTED,
        rejectionReason: parsed.data.reason,
        rejectedAt: new Date(),
        version: { increment: 1 },
      },
      include: { patient: true },
    })

    await tx.requestStatusHistory.create({
      data: {
        consultationRequestId: params.id,
        previousStatus: request.status,
        newStatus: RequestStatus.REJECTED,
        changedByUserId: user.id,
        source: 'ADMIN',
        comment: parsed.data.reason,
      },
    })

    return updated
  })

  if (parsed.data.sendMessage && updated.patient.normalizedPhone) {
    const text = buildRejectionMessage()
    const result = await sendRejectionMessage(updated.patient.normalizedPhone, text, params.id)

    await prisma.whatsAppMessageLog.create({
      data: {
        consultationRequestId: params.id,
        patientId: updated.patient.id,
        direction: MessageDirection.OUTBOUND,
        messageType: 'text',
        messageText: text,
        status: result.success ? MessageStatus.SENT : MessageStatus.SEND_FAILED,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        responsePayload: result.rawResponse as object,
      },
    })
  }

  await auditLog({
    userId: user.id,
    action: 'REJECT_CONSULTATION_REQUEST',
    entityType: 'ConsultationRequest',
    entityId: params.id,
    metadata: { reason: parsed.data.reason },
  })

  return NextResponse.json({ success: true, data: updated })
}
