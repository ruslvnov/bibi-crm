import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { sendTextMessage } from '@/lib/ycloud'
import { MessageDirection, MessageStatus } from '@prisma/client'

const BodySchema = z.object({
  messageText: z.string().min(1),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireRole('OWNER', 'ADMIN')

  const body = await req.json().catch(() => ({}))
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ success: false, code: 'VALIDATION_ERROR' }, { status: 422 })

  const request = await prisma.consultationRequest.findUnique({
    where: { id: params.id },
    include: { patient: true },
  })
  if (!request) return NextResponse.json({ success: false, code: 'NOT_FOUND' }, { status: 404 })
  if (!request.patient.normalizedPhone) {
    return NextResponse.json({ success: false, code: 'NO_PHONE' }, { status: 422 })
  }

  const result = await sendTextMessage({
    to: request.patient.normalizedPhone,
    text: parsed.data.messageText,
    externalId: `retry-${params.id}-${Date.now()}`,
  })

  await prisma.whatsAppMessageLog.create({
    data: {
      consultationRequestId: params.id,
      patientId: request.patient.id,
      direction: MessageDirection.OUTBOUND,
      messageType: 'text',
      messageText: parsed.data.messageText,
      ycloudMessageId: result.ycloudMessageId,
      status: result.success ? MessageStatus.SENT : MessageStatus.SEND_FAILED,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      responsePayload: result.rawResponse as object,
    },
  })

  return NextResponse.json({ success: result.success, result })
}
