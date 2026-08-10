import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { normalizePhone, isValidKgPhone } from '@/lib/phone'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { auditLog, notifyAdmins } from '@/lib/audit'
import { createHash } from 'crypto'
import { fromZonedTime } from 'date-fns-tz'
import { RequestStatus, RequestSource } from '@prisma/client'

const ENDPOINT = '/api/integrations/ycloud/consultation-requests'
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

const PayloadSchema = z.object({
  externalRequestId: z.string().min(1).max(255),
  patient: z.object({
    fullName: z.string().min(1).max(200),
    phone: z.string().min(7).max(20),
    whatsappId: z.string().optional(),
    dateOfBirth: z.string().max(20).optional(),
    district: z.string().max(100).optional(),
    preferredLanguage: z.string().max(10).optional(),
  }),
  consultation: z.object({
    service: z.string().min(1).max(200),
    complaint: z.string().max(1000).optional(),
    missingTeethCount: z.union([z.number().int().min(0).max(32), z.string().transform(Number)]).optional(),
    jaw: z.enum(['upper', 'lower', 'both']).optional(),
    missingDuration: z.string().max(200).optional(),
    rootsRemaining: z.union([z.boolean(), z.string().transform((v) => v === 'true')]).optional(),
    preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional(),
    preferredTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM').optional(),
    timezone: z.string().default('Asia/Bishkek'),
  }),
  ycloud: z
    .object({
      conversationId: z.string().optional(),
      contactId: z.string().optional(),
    })
    .optional(),
})

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

function hashBody(body: unknown): string {
  return createHash('sha256').update(JSON.stringify(body)).digest('hex')
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)

  // Rate limiting: 30 req/min per IP
  const rl = rateLimit(`ycloud-inbound:${ip}`, 30, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ success: false, code: 'RATE_LIMITED' }, { status: 429 })
  }

  // Auth
  const auth = req.headers.get('authorization')
  const secret = process.env.YCLOUD_INBOUND_SECRET
  if (!secret || !auth || auth !== `Bearer ${secret}`) {
    logger.warn('YCloud inbound: unauthorized attempt', { ip })
    return NextResponse.json({ success: false, code: 'UNAUTHORIZED' }, { status: 401 })
  }

  // Content-Type
  if (!req.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ success: false, code: 'INVALID_CONTENT_TYPE' }, { status: 415 })
  }

  // Idempotency key
  const idempotencyKey = req.headers.get('idempotency-key')
  if (!idempotencyKey) {
    return NextResponse.json({ success: false, code: 'MISSING_IDEMPOTENCY_KEY' }, { status: 400 })
  }

  // Parse body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, code: 'INVALID_JSON' }, { status: 400 })
  }

  const requestHash = hashBody(body)

  // Check idempotency record
  const existingIdempotency = await prisma.idempotencyRecord.findUnique({
    where: { key_endpoint: { key: idempotencyKey, endpoint: ENDPOINT } },
  })
  if (existingIdempotency) {
    logger.info('Idempotent request replay', { key: idempotencyKey })
    return NextResponse.json(existingIdempotency.responseBody, { status: existingIdempotency.responseStatus })
  }

  // Validate payload
  const parsed = PayloadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      },
      { status: 422 },
    )
  }

  const data = parsed.data

  // Normalize phone
  const normalizedPhone = normalizePhone(data.patient.phone)
  if (!normalizedPhone) {
    return NextResponse.json(
      { success: false, code: 'VALIDATION_ERROR', errors: [{ field: 'patient.phone', message: 'Invalid phone number' }] },
      { status: 422 },
    )
  }
  if (!isValidKgPhone(normalizedPhone)) {
    return NextResponse.json(
      { success: false, code: 'VALIDATION_ERROR', errors: [{ field: 'patient.phone', message: 'Phone must be a valid Kyrgyzstan number (+996XXXXXXXXX)' }] },
      { status: 422 },
    )
  }

  // Parse and validate preferredDateTime
  let preferredDateTime: Date | undefined
  if (data.consultation.preferredDate && data.consultation.preferredTime) {
    const tz = data.consultation.timezone
    const dtStr = `${data.consultation.preferredDate}T${data.consultation.preferredTime}:00`
    preferredDateTime = fromZonedTime(dtStr, tz)

    if (preferredDateTime < new Date()) {
      return NextResponse.json(
        { success: false, code: 'VALIDATION_ERROR', errors: [{ field: 'consultation.preferredDate', message: 'Preferred date/time cannot be in the past' }] },
        { status: 422 },
      )
    }
  }

  try {
    // Check external ID duplicate
    const existingByExtId = await prisma.consultationRequest.findUnique({
      where: { externalRequestId: data.externalRequestId },
    })
    if (existingByExtId) {
      const dupResponse = {
        success: true,
        duplicate: true,
        requestId: existingByExtId.id,
        status: existingByExtId.status.toLowerCase(),
      }
      await saveIdempotency(idempotencyKey, requestHash, 200, dupResponse)
      return NextResponse.json(dupResponse, { status: 200 })
    }

    // Check active duplicate by phone + preferredDateTime
    if (normalizedPhone && preferredDateTime) {
      const activeDuplicate = await prisma.consultationRequest.findFirst({
        where: {
          patient: { normalizedPhone },
          preferredDateTime,
          status: { in: [RequestStatus.PENDING, RequestStatus.CONFIRMED, RequestStatus.RESCHEDULE_PROPOSED] },
        },
      })
      if (activeDuplicate) {
        return NextResponse.json(
          { success: false, code: 'ACTIVE_DUPLICATE_REQUEST' },
          { status: 409 },
        )
      }
    }

    // Check slot conflict: is this time already taken by ANY patient?
    if (preferredDateTime) {
      const slotStart = new Date(preferredDateTime.getTime() - 59 * 60 * 1000)
      const slotEnd = new Date(preferredDateTime.getTime() + 59 * 60 * 1000)
      const slotConflict = await prisma.consultationRequest.findFirst({
        where: {
          preferredDateTime: { gte: slotStart, lte: slotEnd },
          status: { notIn: [RequestStatus.CANCELLED, RequestStatus.REJECTED, RequestStatus.NO_SHOW] },
        },
      })
      if (slotConflict) {
        // Slot already taken — return success so bot doesn't retry, but skip creating duplicate record
        const skipResponse = { success: true, duplicate: true, code: 'SLOT_CONFLICT', message: 'Slot already booked by another patient' }
        await saveIdempotency(idempotencyKey, requestHash, 200, skipResponse)
        return NextResponse.json(skipResponse, { status: 200 })
      }
    }

    // Upsert patient + create request in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Upsert patient
      const patient = await tx.patient.upsert({
        where: { normalizedPhone },
        update: {
          ...(data.patient.whatsappId ? { whatsappId: data.patient.whatsappId } : {}),
          ...(data.patient.dateOfBirth ? { dateOfBirth: data.patient.dateOfBirth } : {}),
          ...(data.patient.district ? { district: data.patient.district } : {}),
          ...(data.patient.preferredLanguage ? { preferredLanguage: data.patient.preferredLanguage } : {}),
        },
        create: {
          fullName: data.patient.fullName,
          phone: data.patient.phone,
          normalizedPhone,
          whatsappId: data.patient.whatsappId,
          dateOfBirth: data.patient.dateOfBirth || undefined,
          district: data.patient.district,
          preferredLanguage: data.patient.preferredLanguage ?? 'ru',
        },
      })

      // Create request
      const request = await tx.consultationRequest.create({
        data: {
          externalRequestId: data.externalRequestId,
          patientId: patient.id,
          service: data.consultation.service,
          complaint: data.consultation.complaint,
          missingTeethCount: data.consultation.missingTeethCount != null ? Number(data.consultation.missingTeethCount) : undefined,
          jaw: data.consultation.jaw,
          missingDuration: data.consultation.missingDuration,
          rootsRemaining: data.consultation.rootsRemaining,
          district: data.patient.district,
          preferredDate: data.consultation.preferredDate,
          preferredTime: data.consultation.preferredTime,
          preferredDateTime,
          status: RequestStatus.PENDING,
          source: RequestSource.YCLOUD_AI,
          ycloudConversationId: data.ycloud?.conversationId,
          ycloudContactId: data.ycloud?.contactId,
        },
      })

      // Status history
      await tx.requestStatusHistory.create({
        data: {
          consultationRequestId: request.id,
          previousStatus: null,
          newStatus: RequestStatus.PENDING,
          source: 'YCLOUD_AI',
          comment: 'Заявка создана через YCloud AI агент',
        },
      })

      return { patient, request }
    })

    // Non-critical: notify admins, audit
    await notifyAdmins({
      type: 'NEW_REQUEST',
      title: 'Новая заявка на консультацию',
      message: `Новая заявка от ${result.patient.fullName} (${data.consultation.service})`,
      entityId: result.request.id,
    })

    await auditLog({
      action: 'CREATE_CONSULTATION_REQUEST',
      entityType: 'ConsultationRequest',
      entityId: result.request.id,
      metadata: { source: 'YCLOUD_AI', ip, externalRequestId: data.externalRequestId },
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') ?? undefined,
    })

    const successResponse = {
      success: true,
      requestId: result.request.id,
      status: 'pending',
      message: 'Consultation request created and awaiting administrator confirmation',
    }

    await saveIdempotency(idempotencyKey, requestHash, 201, successResponse)
    logger.info('Consultation request created', { requestId: result.request.id, patientId: result.patient.id })
    return NextResponse.json(successResponse, { status: 201 })
  } catch (err) {
    logger.error('Failed to create consultation request', { error: (err as Error).message })
    return NextResponse.json({ success: false, code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

async function saveIdempotency(key: string, requestHash: string, status: number, body: unknown) {
  try {
    await prisma.idempotencyRecord.create({
      data: {
        key,
        endpoint: ENDPOINT,
        requestHash,
        responseStatus: status,
        responseBody: body as object,
        expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
      },
    })
  } catch {
    // Race condition — ignore
  }
}
