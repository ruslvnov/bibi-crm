import { Badge } from '@/components/ui/badge'
import { RequestStatus } from '@prisma/client'

export const STATUS_CONFIG: Record<RequestStatus, { label: string; className: string; dot: string }> = {
  PENDING:              { label: 'Новая',       className: 'bg-gray-100 text-gray-700 hover:bg-gray-100',       dot: 'bg-gray-400' },
  CONFIRMED:            { label: 'Подтвержден', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100', dot: 'bg-yellow-400' },
  COMPLETED:            { label: 'Пришел',      className: 'bg-green-100 text-green-800 hover:bg-green-100',   dot: 'bg-green-500' },
  NO_SHOW:              { label: 'Не пришел',   className: 'bg-red-100 text-red-800 hover:bg-red-100',         dot: 'bg-red-500' },
  RESCHEDULE_PROPOSED:  { label: 'Перенос',     className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',      dot: 'bg-blue-500' },
  REJECTED:             { label: 'Отклонена',   className: 'bg-gray-100 text-gray-500 hover:bg-gray-100',      dot: 'bg-gray-300' },
  CANCELLED:            { label: 'Отменена',    className: 'bg-gray-100 text-gray-500 hover:bg-gray-100',      dot: 'bg-gray-300' },
}

interface StatusBadgeProps {
  status: RequestStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: '', dot: 'bg-gray-400' }
  return (
    <Badge className={`${config.className} flex items-center gap-1.5`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} flex-shrink-0`} />
      {config.label}
    </Badge>
  )
}
