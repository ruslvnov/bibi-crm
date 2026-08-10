import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { RecentRequests } from '@/components/dashboard/RecentRequests'
import { RequestStatus } from '@prisma/client'
import { startOfDay, endOfDay } from 'date-fns'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const today = new Date()

  const [pending, confirmedToday, rescheduleProposed, cancelled, noShow, total, upcomingToday, recentRequests] =
    await Promise.all([
      prisma.consultationRequest.count({ where: { status: RequestStatus.PENDING } }),
      prisma.consultationRequest.count({
        where: { status: RequestStatus.CONFIRMED, confirmedAt: { gte: startOfDay(today), lte: endOfDay(today) } },
      }),
      prisma.consultationRequest.count({ where: { status: RequestStatus.RESCHEDULE_PROPOSED } }),
      prisma.consultationRequest.count({ where: { status: RequestStatus.CANCELLED } }),
      prisma.consultationRequest.count({ where: { status: RequestStatus.NO_SHOW } }),
      prisma.consultationRequest.count(),
      prisma.consultationRequest.findMany({
        where: {
          status: RequestStatus.CONFIRMED,
          preferredDateTime: { gte: startOfDay(today), lte: endOfDay(today) },
        },
        include: { patient: true, assignedAdmin: { select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true } }, statusHistory: { orderBy: { createdAt: 'asc' } } },
        orderBy: { preferredDateTime: 'asc' },
        take: 10,
      }),
      prisma.consultationRequest.findMany({
        include: { patient: true, assignedAdmin: { select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true } }, statusHistory: { orderBy: { createdAt: 'asc' } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Главная панель</h1>
        <p className="text-gray-500 mt-1">Обзор заявок и активности</p>
      </div>

      <DashboardStats
        stats={{ pending, confirmedToday, rescheduleProposed, cancelled, noShow, total, upcomingToday, recentActivity: [] }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Ближайшие консультации сегодня</h2>
          <RecentRequests requests={upcomingToday} emptyText="Нет консультаций на сегодня" />
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-3">Последние заявки</h2>
          <RecentRequests requests={recentRequests} />
        </div>
      </div>
    </div>
  )
}
