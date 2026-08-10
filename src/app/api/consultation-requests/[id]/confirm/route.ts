import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { sendConfirmationMessage } from '@/lib/ycloud'
import { buildConfirmationMessage } from '@/lib/messages'
import { auditLog } from '@/lib/audit'
import { logger } from '@/lib/logger'
import { RequestStatus, MessageDirection, MessageStatus } from '@prisma/client'

const BodySchema = z.object({
  confirmedDateTime: z.string().datetime().optional(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireRole('OWNER', 'ADMIN')

  const body = await req.json().catch(() => ({}))
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, code: 'VALIDATION_ERROR' }, { status: 422 })
  }

  const request = await prisma.consultationRequest.findUnique({
    where: { id: params.id },
    include: { patient: true },
  })

  if (!request) return NextResponse.json({ success: false, code: 'NOT_FOUND' }, { status: 404 })

  if (request.status === RequestStatus.CONFIRMED) {
    return NextResponse.json({ success: true, alreadyConfirmed: true, data: request })
  }

  const allowedStatuses: RequestStatus[] = [RequestStatus.PENDING, RequestStatus.RESCHEDULE_PROPOSED]
  if (!allowedStatuses.includes(request.status)) {
    return NextResponse.json(
      { success: false, code: 'INVALID_STATUS_TRANSITION', currentStatus: request.status },
      { status: 409 },
    )
  }

  const finalDateTime = parsed.data.confirmedDateTime
    ? new Date(parsed.data.confirmedDateTime)
    : request.preferredDateTime ?? new Date()

  // Update status + history in transaction
  const updated = await prisma.$transaction(async (tx) => {
    const updated = await tx.consultationRequest.update({
      where: { id: params.id, version: request.version },
      data: {
        status: RequestStatus.CONFIRMED,
        confirmedAt: new Date(),
        assignedAdminId: user.id,
        preferredDateTime: finalDateTime,
        version: { increment: 1 },
      },
      include: { patient: true },
    })

    await tx.requestStatusHistory.create({
      data: {
        consultationRequestId: params.id,
        previousStatus: request.status,
        newStatus: RequestStatus.CONFIRMED,
        changedByUserId: user.id,
        source: 'ADMIN',
      },
    })

    return updated
  })

  // Send WhatsApp message (non-blocking for status change)
  let whatsappWarning: string | undefined
  if (updated.patient.normalizedPhone) {
    const text = buildConfirmationMessage(finalDateTime)
    const result = await sendConfirmationMessage(updated.patient.normalizedPhone, text, params.id)

    await prisma.whatsAppMessageLog.create({
      data: {
        consultationRequestId: params.id,
        patientId: updated.patient.id,
        direction: MessageDirection.OUTBOUND,
        messageType: 'text',
        messageText: text,
        ycloudMessageId: result.ycloudMessageId,
        externalId: `consultation-confirmation-${params.id}`,
        status: result.success ? MessageStatus.SENT : MessageStatus.SEND_FAILED,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        requestPayload: { to: updated.patient.normalizedPhone, externalId: `consultation-confirmation-${params.id}` },
        responsePayload: result.rawResponse as object,
      },
    })

    if (!result.success) {
      whatsappWarning = `Статус обновлён, но WhatsApp-сообщение не отправлено: ${result.errorMessage}`
      logger.warn('WhatsApp confirmation failed', { requestId: params.id, error: result.errorMessage })
    }
  }

  await auditLog({
    userId: user.id,
    action: 'CONFIRM_CONSULTATION_REQUEST',
    entityType: 'ConsultationRequest',
    entityId: params.id,
    metadata: { previousStatus: request.status, confirmedAt: updated.confirmedAt },
  })

  return NextResponse.json({
    success: true,
    data: updated,
    ...(whatsappWarning ? { warning: whatsappWarning } : {}),
  })
}
