import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { StatusBadge } from '@/components/requests/StatusBadge'
import Link from 'next/link'

export default async function HistoryPage() {
  await requireAuth()

  const history = await prisma.requestStatusHistory.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      consultationRequest: { include: { patient: true } },
      changedBy: { select: { id: true, name: true } },
    },
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">История действий</h1>
        <p className="text-gray-500 mt-1">Все изменения статусов заявок</p>
      </div>

      <div className="bg-white rounded-lg border divide-y">
        {history.length === 0 && (
          <div className="p-8 text-center text-gray-500">История пуста</div>
        )}
        {history.map((h) => (
          <div key={h.id} className="p-4 flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/requests/${h.consultationRequestId}`}
                  className="font-medium text-blue-600 hover:underline truncate"
                >
                  {h.consultationRequest.patient.fullName}
                </Link>
                <span className="text-gray-400 text-sm">·</span>
                {h.previousStatus && <StatusBadge status={h.previousStatus} />}
                {h.previousStatus && <span className="text-gray-400">→</span>}
                <StatusBadge status={h.newStatus} />
              </div>
              {h.comment && <p className="text-sm text-gray-600 mt-1">{h.comment}</p>}
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                <span>{h.changedBy?.name ?? h.source ?? 'Система'}</span>
                <span>·</span>
                <span>{formatDistanceToNow(h.createdAt, { addSuffix: true, locale: ru })}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
