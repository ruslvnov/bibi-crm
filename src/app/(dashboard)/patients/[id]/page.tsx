import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { PatientDetail } from '@/components/patients/PatientDetail'

export default async function PatientDetailPage({ params }: { params: { id: string } }) {
  await requireAuth()

  const patient = await prisma.patient.findUnique({
    where: { id: params.id },
    include: {
      consultationRequests: {
        orderBy: { preferredDateTime: 'desc' },
        select: { id: true, service: true, complaint: true, preferredDate: true, preferredTime: true, preferredDateTime: true, status: true, createdAt: true },
      },
    },
  })

  if (!patient) notFound()

  return <PatientDetail patient={{
    ...patient,
    createdAt: patient.createdAt.toISOString(),
    consultationRequests: patient.consultationRequests.map(r => ({
      ...r,
      preferredDateTime: r.preferredDateTime?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
  }} />
}
