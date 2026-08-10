import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireAuth, requireRole } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireAuth()

  const patient = await prisma.patient.findUnique({
    where: { id: params.id },
    include: {
      consultationRequests: {
        orderBy: { createdAt: 'desc' },
        include: { assignedAdmin: { select: { id: true, name: true } } },
      },
    },
  })

  if (!patient) return NextResponse.json({ success: false, code: 'NOT_FOUND' }, { status: 404 })
  return NextResponse.json({ success: true, data: patient })
}

const UpdateSchema = z.object({
  fullName: z.string().min(1).optional(),
  dateOfBirth: z.string().optional(),
  district: z.string().optional(),
  preferredLanguage: z.string().optional(),
})

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await requireRole('OWNER', 'ADMIN')

  const patient = await prisma.patient.findUnique({
    where: { id: params.id },
    include: { consultationRequests: { select: { id: true } } },
  })
  if (!patient) return NextResponse.json({ success: false, code: 'NOT_FOUND' }, { status: 404 })

  const requestIds = patient.consultationRequests.map(r => r.id)

  await prisma.$transaction([
    prisma.requestStatusHistory.deleteMany({ where: { consultationRequestId: { in: requestIds } } }),
    prisma.whatsAppMessageLog.deleteMany({ where: { patientId: params.id } }),
    prisma.consultationRequest.deleteMany({ where: { patientId: params.id } }),
    prisma.patient.delete({ where: { id: params.id } }),
  ])

  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await requireRole('OWNER', 'ADMIN')

  const body = await req.json().catch(() => ({}))
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ success: false, code: 'VALIDATION_ERROR' }, { status: 422 })

  const patient = await prisma.patient.update({
    where: { id: params.id },
    data: parsed.data,
  })

  return NextResponse.json({ success: true, data: patient })
}
