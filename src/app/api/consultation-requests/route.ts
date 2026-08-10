import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { fromZonedTime } from 'date-fns-tz'

const TZ = 'Asia/Bishkek'

const QuerySchema = z.object({
  status: z.string().optional(),
  source: z.string().optional(),
  service: z.string().optional(),
  district: z.string().optional(),
  adminId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(20),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export async function GET(req: NextRequest) {
  await requireAuth()

  const params = Object.fromEntries(req.nextUrl.searchParams.entries())
  const query = QuerySchema.parse(params)

  const where: Record<string, unknown> = {}

  if (query.status) where.status = query.status
  if (query.source) where.source = query.source
  if (query.district) where.district = query.district
  if (query.adminId) where.assignedAdminId = query.adminId
  if (query.service) where.service = { contains: query.service, mode: 'insensitive' }

  if (query.dateFrom || query.dateTo) {
    where.preferredDateTime = {
      ...(query.dateFrom ? { gte: fromZonedTime(new Date(query.dateFrom + 'T00:00:00'), TZ) } : {}),
      ...(query.dateTo ? { lte: fromZonedTime(new Date(query.dateTo + 'T23:59:59'), TZ) } : {}),
    }
  }

  if (query.search) {
    where.OR = [
      { patient: { fullName: { contains: query.search, mode: 'insensitive' } } },
      { patient: { normalizedPhone: { contains: query.search } } },
      { id: { contains: query.search } },
    ]
  }

  const [data, total] = await Promise.all([
    prisma.consultationRequest.findMany({
      where,
      include: {
        patient: true,
        assignedAdmin: { select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { [query.sortBy]: query.sortOrder },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.consultationRequest.count({ where }),
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
