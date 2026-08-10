import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { sendRescheduleMessage } from '@/lib/ycloud'
import { buildRescheduleMessage } from '@/lib/messages'
import { auditLog } from '@/lib/audit'
import { RequestStatus, MessageDirection, MessageStatus } from '@prisma/client'

const BodySchema = z.object({
  suggestedDateTime: z.string().datetime(),
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

  const allowed: RequestStatus[] = [RequestStatus.PENDING, RequestStatus.RESCHEDULE_PROPOSED]
  if (!allowed.includes(request.status)) {
    return NextResponse.json({ success: false, code: 'INVALID_STATUS_TRANSITION' }, { status: 409 })
  }

  const suggestedDT = new Date(parsed.data.suggestedDateTime)

  const updated = await prisma.$transaction(async (tx) => {
    const updated = await tx.consultationRequest.update({
      where: { id: params.id, version: request.version },
      data: {
        status: RequestStatus.RESCHEDULE_PROPOSED,
        rescheduleSuggestedDateTime: suggestedDT,
        assignedAdminId: user.id,
        version: { increment: 1 },
      },
      include: { patient: true },
    })

    await tx.requestStatusHistory.create({
      data: {
        consultationRequestId: params.id,
        previousStatus: request.status,
        newStatus: RequestStatus.RESCHEDULE_PROPOSED,
        changedByUserId: user.id,
        source: 'ADMIN',
        comment: `Предложено время: ${suggestedDT.toISOString()}`,
      },
    })

    return updated
  })

  let whatsappWarning: string | undefined
  if (updated.patient.normalizedPhone) {
    const text = buildRescheduleMessage(suggestedDT)
    const result = await sendRescheduleMessage(updated.patient.normalizedPhone, text, params.id)

    await prisma.whatsAppMessageLog.create({
      data: {
        consultationRequestId: params.id,
        patientId: updated.patient.id,
        direction: MessageDirection.OUTBOUND,
        messageType: 'text',
        messageText: text,
        ycloudMessageId: result.ycloudMessageId,
        status: result.success ? MessageStatus.SENT : MessageStatus.SEND_FAILED,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        responsePayload: result.rawResponse as object,
      },
    })

    if (!result.success) {
      whatsappWarning = `Сообщение о переносе не отправлено: ${result.errorMessage}`
    }
  }

  await auditLog({
    userId: user.id,
    action: 'RESCHEDULE_CONSULTATION_REQUEST',
    entityType: 'ConsultationRequest',
    entityId: params.id,
    metadata: { suggestedDateTime: suggestedDT },
  })

  return NextResponse.json({ success: true, data: updated, ...(whatsappWarning ? { warning: whatsappWarning } : {}) })
}
