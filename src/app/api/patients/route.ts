import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { normalizePhone } from '@/lib/phone'

const QuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export async function POST(req: NextRequest) {
  await requireAuth()
  const { fullName, phone, dateOfBirth, district } = await req.json()
  if (!fullName || !phone) {
    return NextResponse.json({ error: 'ФИО и телефон обязательны' }, { status: 400 })
  }
  const normalizedPhone = normalizePhone(phone) || phone

  // Try to find by phone first, then by name+DOB
  let patient = await prisma.patient.findUnique({ where: { normalizedPhone } })

  if (!patient && fullName && dateOfBirth) {
    patient = await prisma.patient.findFirst({
      where: {
        fullName: { equals: fullName.trim(), mode: 'insensitive' },
        dateOfBirth,
      },
    })
  }

  if (patient) {
    // Update missing fields
    patient = await prisma.patient.update({
      where: { id: patient.id },
      data: {
        ...(dateOfBirth && !patient.dateOfBirth ? { dateOfBirth } : {}),
        ...(district && !patient.district ? { district } : {}),
      },
    })
  } else {
    patient = await prisma.patient.create({
      data: {
        fullName: fullName.trim(),
        phone,
        normalizedPhone,
        dateOfBirth: dateOfBirth || undefined,
        district: district || undefined,
        preferredLanguage: 'ru',
      },
    })
  }

  return NextResponse.json({ success: true, data: patient }, { status: 201 })
}

export async function GET(req: NextRequest) {
  await requireAuth()

  const params = Object.fromEntries(req.nextUrl.searchParams.entries())
  const query = QuerySchema.parse(params)

  const where: Record<string, unknown> = {}
  if (query.search) {
    where.OR = [
      { fullName: { contains: query.search, mode: 'insensitive' } },
      { normalizedPhone: { contains: query.search } },
    ]
  }

  const [data, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      include: {
        _count: { select: { consultationRequests: true } },
        consultationRequests: {
          orderBy: { preferredDateTime: 'desc' },
          take: 1,
          select: { id: true, status: true, preferredDateTime: true, service: true },
        },
      },
      orderBy: { fullName: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.patient.count({ where }),
  ])

  return NextResponse.json({
    success: true,
    data,
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.ceil(total / query.pageSize),
  })
}
