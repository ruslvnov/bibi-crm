import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { RequestDetail } from '@/components/requests/RequestDetail'

export default async function RequestDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) notFound()

  const request = await prisma.consultationRequest.findUnique({
    where: { id: params.id },
    include: {
      patient: true,
      assignedAdmin: { select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true } },
      statusHistory: {
        orderBy: { createdAt: 'asc' },
        include: { changedBy: { select: { id: true, name: true } } },
      },
      messageLogs: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!request) notFound()

  return <RequestDetail request={request} currentUser={user} />
}
