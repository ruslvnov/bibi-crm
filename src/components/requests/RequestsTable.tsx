'use client'

import { useQuery } from '@tanstack/react-query'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { formatInTimeZone } from 'date-fns-tz'
import { StatusSelect } from './StatusSelect'
import { Button } from '@/components/ui/button'
import type { RequestWithRelations, PaginatedResponse } from '@/types'
import { ChevronRight, Clock } from 'lucide-react'

const TZ = 'Asia/Bishkek'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Новая', color: 'bg-gray-100 text-gray-600' },
  CONFIRMED: { label: 'Подтверждён', color: 'bg-yellow-100 text-yellow-700' },
  COMPLETED: { label: 'Пришёл', color: 'bg-green-100 text-green-700' },
  NO_SHOW: { label: 'Не пришёл', color: 'bg-red-100 text-red-700' },
  RESCHEDULE_PROPOSED: { label: 'Перенос', color: 'bg-blue-100 text-blue-700' },
  CANCELLED: { label: 'Отменена', color: 'bg-gray-100 text-gray-500' },
  REJECTED: { label: 'Отклонена', color: 'bg-red-100 text-red-700' },
}

export function RequestsTable() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const page = Number(searchParams.get('page') ?? '1')

  const params = new URLSearchParams(searchParams.toString())
  params.set('source', 'YCLOUD_AI')
  if (params.has('dateFrom') && !params.has('sortBy')) {
    params.set('sortBy', 'preferredDateTime')
    params.set('sortOrder', 'asc')
    params.set('pageSize', '100')
  }

  const { data, isLoading, error } = useQuery<PaginatedResponse<RequestWithRelations>>({
    queryKey: ['consultation-requests', params.toString()],
    queryFn: () =>
      fetch(`/api/consultation-requests?${params}`).then((r) => r.json()).then((r) => r),
    refetchInterval: 15_000,
  })

  if (isLoading) return <div className="bg-white rounded-xl border p-8 text-center text-gray-500">Загрузка...</div>
  if (error) return <div className="bg-white rounded-xl border p-8 text-center text-red-500">Ошибка загрузки</div>

  const requests = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1

  function formatTime(req: RequestWithRelations) {
    if (req.preferredDateTime)
      return formatInTimeZone(new Date(req.preferredDateTime), TZ, 'HH:mm', { locale: ru })
    if (req.preferredDate) return `${req.preferredDate} ${req.preferredTime ?? ''}`
    return '—'
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border overflow-hidden">

        {/* Mobile cards */}
        <div className="md:hidden divide-y">
          {requests.length === 0 && (
            <div className="py-10 text-center text-gray-500 text-sm">Заявки не найдены</div>
          )}
          {requests.map((req) => {
            const st = STATUS_LABELS[req.status]
            return (
              <div
                key={req.id}
                className="p-3 hover:bg-gray-50 active:bg-gray-100 cursor-pointer flex items-start gap-3"
                onClick={() => router.push(`/requests/${req.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="font-semibold text-gray-900 text-sm truncate">{req.patient.fullName}</p>
                    {st && (
                      <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.color}`}>
                        {st.label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 font-mono mb-1">{req.patient.phone}</p>
                  <p className="text-xs text-gray-600 truncate mb-1">{req.service}</p>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                      <Clock className="h-3 w-3" />{formatTime(req)}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true, locale: ru })}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0 mt-1" />
              </div>
            )
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Пациент</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Телефон</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Услуга</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Дата</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Статус</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Источник</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Создана</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {requests.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">Заявки не найдены</td>
                </tr>
              )}
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => router.push(`/requests/${req.id}`)}>
                  <td className="px-4 py-3 font-medium text-gray-900">{req.patient.fullName}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono">{req.patient.phone}</td>
                  <td className="px-4 py-3 text-gray-600">{req.service}</td>
                  <td className="px-4 py-3 text-gray-600">{formatTime(req)}</td>
                  <td className="px-4 py-3">
                    <StatusSelect requestId={req.id} status={req.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{req.source}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true, locale: ru })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Всего: {total}</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => {
                const p = new URLSearchParams(searchParams.toString())
                p.set('page', String(page - 1))
                router.push(`?${p}`)
              }}
            >
              Назад
            </Button>
            <span className="flex items-center text-sm px-2">{page} / {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => {
                const p = new URLSearchParams(searchParams.toString())
                p.set('page', String(page + 1))
                router.push(`?${p}`)
              }}
            >
              Вперёд
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
