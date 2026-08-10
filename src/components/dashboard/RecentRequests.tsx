import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { StatusBadge } from '@/components/requests/StatusBadge'
import type { RequestWithRelations } from '@/types'

interface RecentRequestsProps {
  requests: RequestWithRelations[]
  emptyText?: string
}

export function RecentRequests({ requests, emptyText = 'Нет заявок' }: RecentRequestsProps) {
  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-6 text-center text-gray-500 text-sm">{emptyText}</div>
    )
  }

  return (
    <div className="bg-white rounded-xl border divide-y">
      {requests.map((req) => (
        <Link
          key={req.id}
          href={`/requests/${req.id}`}
          className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{req.patient.fullName}</p>
            <p className="text-sm text-gray-500 truncate">{req.service}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <StatusBadge status={req.status} />
            <span className="text-xs text-gray-400">
              {formatDistanceToNow(req.createdAt, { addSuffix: true, locale: ru })}
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}
