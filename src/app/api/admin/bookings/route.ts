import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { normalizePhone } from '@/lib/phone'
import { fromZonedTime } from 'date-fns-tz'
import { RequestStatus, RequestSource } from '@prisma/client'

export async function POST(req: NextRequest) {
  const user = await requireAuth()

  const { fullName, phone, service, date, time, complaint, dateOfBirth } = await req.json()

  if (!fullName || !phone || !service || !date || !time) {
    return NextResponse.json({ error: 'Заполните все обязательные поля' }, { status: 400 })
  }

  const normalizedPhone = normalizePhone(phone) || phone
  const preferredDateTime = fromZonedTime(`${date}T${time}:00`, 'Asia/Bishkek')

  // Check if the time slot is already taken
  const slotStart = preferredDateTime
  const slotEnd = new Date(preferredDateTime.getTime() + 59 * 60 * 1000) // +59 min
  const existing = await prisma.consultationRequest.findFirst({
    where: {
      preferredDateTime: { gte: slotStart, lte: slotEnd },
      status: { notIn: ['CANCELLED', 'REJECTED', 'NO_SHOW'] },
    },
    select: { id: true, patient: { select: { fullName: true } } },
  })
  if (existing) {
    return NextResponse.json(
      { error: `Это время уже занято (${existing.patient.fullName})` },
      { status: 409 }
    )
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Try to find existing patient by phone
      let patient = await tx.patient.findUnique({ where: { normalizedPhone } })

      // 2. If not found by phone, try name + date of birth (case-insensitive)
      if (!patient && fullName && dateOfBirth) {
        patient = await tx.patient.findFirst({
          where: {
            fullName: { equals: fullName.trim(), mode: 'insensitive' },
            dateOfBirth,
          },
        })
      }

      // 3. Create new patient if still not found
      if (!patient) {
        patient = await tx.patient.create({
          data: {
            fullName: fullName.trim(),
            phone,
            normalizedPhone,
            preferredLanguage: 'ru',
            dateOfBirth: dateOfBirth || undefined,
          },
        })
      } else {
        // Update missing fields if found
        if (dateOfBirth && !patient.dateOfBirth) {
          patient = await tx.patient.update({
            where: { id: patient.id },
            data: { dateOfBirth },
          })
        }
      }

      const request = await tx.consultationRequest.create({
        data: {
          externalRequestId: `admin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          patientId: patient.id,
          service,
          complaint: complaint || undefined,
          preferredDate: date,
          preferredTime: time,
          preferredDateTime,
          status: RequestStatus.CONFIRMED,
          source: RequestSource.MANUAL,
          assignedAdminId: user.id,
        },
        include: { patient: true },
      })

      await tx.requestStatusHistory.create({
        data: {
          consultationRequestId: request.id,
          previousStatus: null,
          newStatus: RequestStatus.CONFIRMED,
          changedByUserId: user.id,
          source: 'ADMIN',
          comment: 'Запись добавлена администратором вручную',
        },
      })

      return request
    })

    return NextResponse.json({ success: true, requestId: result.id, data: result }, { status: 201 })
  } catch (err) {
    console.error('Admin booking error:', err)
    return NextResponse.json({ error: 'Ошибка при создании записи' }, { status: 500 })
  }
}
