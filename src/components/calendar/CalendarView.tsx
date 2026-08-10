'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import {
  startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay,
  addWeeks, subWeeks, startOfMonth, endOfMonth, isSameMonth, addMonths, subMonths,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { DeleteButton } from '@/components/ui/DeleteButton'
import { RequestStatus } from '@prisma/client'

const TZ = 'Asia/Bishkek'
const HOURS = Array.from({ length: 10 }, (_, i) => i + 10)
const DAY_NAMES = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС']

type Request = {
  id: string
  preferredDateTime: string
  patient: { fullName: string }
  service: string
  status: RequestStatus
}

type SelectedSlot = { date: Date; hour: number }

function statusColor(status: string) {
  if (status === 'CONFIRMED') return 'bg-yellow-50 border-yellow-300 text-yellow-900'
  if (status === 'COMPLETED') return 'bg-green-50 border-green-300 text-green-900'
  if (status === 'NO_SHOW') return 'bg-red-50 border-red-300 text-red-900'
  if (status === 'RESCHEDULE_PROPOSED') return 'bg-blue-50 border-blue-300 text-blue-900'
  if (status === 'PENDING') return 'bg-gray-50 border-gray-300 text-gray-700'
  return 'bg-gray-50 border-gray-200 text-gray-500'
}

function statusBar(status: string) {
  if (status === 'CONFIRMED') return 'border-l-yellow-400 bg-yellow-50 text-yellow-900'
  if (status === 'COMPLETED') return 'border-l-green-400 bg-green-50 text-green-900'
  if (status === 'NO_SHOW') return 'border-l-red-400 bg-red-50 text-red-900'
  if (status === 'RESCHEDULE_PROPOSED') return 'border-l-blue-400 bg-blue-50 text-blue-900'
  if (status === 'PENDING') return 'border-l-gray-400 bg-gray-50 text-gray-700'
  return 'border-l-gray-300 bg-gray-50 text-gray-500'
}

function pad(n: number) { return String(n).padStart(2, '0') }

function BookingModal({ slot, onClose, onSave }: {
  slot: SelectedSlot
  onClose: () => void
  onSave: () => void
}) {
  const [form, setForm] = useState({ fullName: '', phone: '', dateOfBirth: '', service: '', complaint: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const dateStr = format(slot.date, 'yyyy-MM-dd')
  const timeStr = `${pad(slot.hour)}:00`

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, date: dateStr, time: timeStr }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Ошибка'); return }
      onSave()
      onClose()
    } catch {
      setError('Ошибка соединения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-gray-900">
            Запись на {format(slot.date, 'd MMMM', { locale: ru })} в {timeStr}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-700">Имя пациента *</label>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.fullName}
              onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
              placeholder="Иванов Иван"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700">Телефон *</label>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+996 XXX XXX XXX"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700">Дата рождения</label>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.dateOfBirth}
              onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))}
              placeholder="ДД.ММ.ГГГГ"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700">Услуга *</label>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.service}
              onChange={e => setForm(f => ({ ...f, service: e.target.value }))}
              placeholder="Консультация, имплантация..."
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700">Комментарий</label>
            <textarea
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
              value={form.complaint}
              onChange={e => setForm(f => ({ ...f, complaint: e.target.value }))}
              placeholder="Жалобы, пожелания..."
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Отмена</Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Сохранение...' : 'Записать'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'week' | 'month'>('week')
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null)
  const [refetchKey, setRefetchKey] = useState(0)
  const queryClient = useQueryClient()

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const rangeStart = view === 'week' ? weekStart : monthStart
  const rangeEnd = view === 'week' ? weekEnd : monthEnd

  const { data } = useQuery({
    queryKey: ['calendar-requests', format(rangeStart, 'yyyy-MM-dd'), view, refetchKey],
    queryFn: () =>
      fetch(`/api/consultation-requests?dateFrom=${format(rangeStart, 'yyyy-MM-dd')}&dateTo=${format(rangeEnd, 'yyyy-MM-dd')}&pageSize=200`)
        .then(r => r.json())
        .then(r => r.data ?? []),
    refetchInterval: 30_000,
  })

  const requests: Request[] = data ?? []
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const monthDays = view === 'month'
    ? eachDayOfInterval({ start: startOfWeek(monthStart, { weekStartsOn: 1 }), end: endOfWeek(monthEnd, { weekStartsOn: 1 }) })
    : []

  function requestsForDay(day: Date) {
    const dayStr = formatInTimeZone(day, TZ, 'yyyy-MM-dd')
    return requests.filter(r => {
      if (!r.preferredDateTime) return false
      return formatInTimeZone(new Date(r.preferredDateTime), TZ, 'yyyy-MM-dd') === dayStr
    })
  }

  function requestsForSlot(day: Date, hour: number) {
    return requestsForDay(day).filter(r => {
      const h = parseInt(formatInTimeZone(new Date(r.preferredDateTime), TZ, 'H'))
      return h === hour
    })
  }

  function navigate(dir: number) {
    if (view === 'week') setCurrentDate(d => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1))
    else setCurrentDate(d => dir > 0 ? addMonths(d, 1) : subMonths(d, 1))
  }

  const headerLabel = view === 'week'
    ? `${format(weekStart, 'd MMM', { locale: ru })} – ${format(weekEnd, 'd MMM yyyy', { locale: ru })}`
    : format(currentDate, 'LLLL yyyy', { locale: ru })

  return (
    <>
      <div className="bg-white rounded-xl border overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 90px)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b flex-shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold text-gray-900 capitalize w-48 text-center">{headerLabel}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCurrentDate(new Date())}>Сегодня</Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-yellow-100 border border-yellow-300 inline-block" /> Новая</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-100 border border-green-300 inline-block" /> Подтверждена</span>
            </div>
            <div className="flex gap-1">
              <Button variant={view === 'week' ? 'default' : 'outline'} size="sm" className="h-8 text-xs" onClick={() => setView('week')}>Неделя</Button>
              <Button variant={view === 'month' ? 'default' : 'outline'} size="sm" className="h-8 text-xs" onClick={() => setView('month')}>Месяц</Button>
            </div>
          </div>
        </div>

        {view === 'week' ? (
          <div className="overflow-auto flex-1">
            {/* Day headers */}
            <div className="grid sticky top-0 bg-white z-10 border-b" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
              <div className="border-r" />
              {weekDays.map((day, i) => {
                const isToday = isSameDay(day, new Date())
                const count = requestsForDay(day).length
                return (
                  <div key={i} className={`py-2 text-center border-r last:border-r-0 ${isToday ? 'bg-blue-50' : ''}`}>
                    <div className="text-[11px] text-gray-400 font-semibold">{DAY_NAMES[i]}</div>
                    <div className={`text-lg font-bold mx-auto w-8 h-8 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-gray-900'}`}>
                      {format(day, 'd')}
                    </div>
                    {count > 0 && <div className="text-[10px] text-blue-500">{count} зап.</div>}
                  </div>
                )
              })}
            </div>

            {/* Time rows */}
            {HOURS.map(hour => (
              <div key={hour} className="grid border-b last:border-b-0" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
                <div className="border-r text-[11px] text-gray-600 font-bold font-mono text-right pr-2 pt-1.5 select-none h-[88px] flex-shrink-0">
                  {pad(hour)}:00
                </div>
                {weekDays.map((day, di) => {
                  const slotReqs = requestsForSlot(day, hour)
                  const isToday = isSameDay(day, new Date())
                  const main = slotReqs[0] ?? null
                  const extras = slotReqs.length - 1
                  return (
                    <div
                      key={di}
                      className={`border-r last:border-r-0 h-[88px] p-0.5 group relative overflow-hidden ${isToday ? 'bg-blue-50/20' : ''} ${!main ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                      onClick={() => { if (!main) setSelectedSlot({ date: day, hour }) }}
                    >
                      {main ? (
                        <div
                          className={`h-full border-l-[3px] rounded-r px-2 py-1.5 flex flex-col justify-between overflow-hidden group/card ${statusBar(main.status)}`}
                          onClick={e => e.stopPropagation()}
                        >
                          <Link href={`/requests/${main.id}`} className="flex-1 min-w-0 overflow-hidden block">
                            <div className="font-semibold text-xs leading-snug truncate">{main.patient.fullName}</div>
                            <div className="text-[10px] opacity-60 leading-snug mt-0.5 line-clamp-2">{main.service}</div>
                          </Link>
                          <div className="flex items-center justify-between mt-1">
                            {extras > 0 && (
                              <span className="text-[9px] text-red-500 font-semibold">+{extras} доп.</span>
                            )}
                            <div className={`${extras > 0 ? '' : 'ml-auto'} opacity-0 group-hover/card:opacity-100 transition-opacity`}>
                              <DeleteButton
                                iconOnly
                                label="Удалить запись"
                                onConfirm={async () => {
                                  await fetch(`/api/consultation-requests/${main.id}`, { method: 'DELETE' })
                                  queryClient.invalidateQueries({ queryKey: ['calendar-requests'] })
                                  queryClient.refetchQueries({ queryKey: ['calendar-requests'] })
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-7 border-b">
              {DAY_NAMES.map(d => (
                <div key={d} className="p-2 text-center text-xs font-semibold text-gray-500">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthDays.map((day, i) => {
                const dayReqs = requestsForDay(day)
                const isToday = isSameDay(day, new Date())
                const isCurrentMonth = isSameMonth(day, currentDate)
                return (
                  <div key={i} className={`min-h-[90px] p-1.5 border-b border-r last:border-r-0 ${!isCurrentMonth ? 'bg-gray-50' : ''}`}>
                    <div className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-blue-600 text-white' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {dayReqs.slice(0, 3).map(r => (
                        <Link key={r.id} href={`/requests/${r.id}`} onClick={e => e.stopPropagation()}>
                          <div className={`text-[10px] rounded px-1 py-0.5 truncate border cursor-pointer hover:opacity-80 ${statusColor(r.status)}`}>
                            {r.preferredDateTime ? formatInTimeZone(new Date(r.preferredDateTime), TZ, 'HH:mm') + ' ' : ''}
                            {r.patient.fullName}
                          </div>
                        </Link>
                      ))}
                      {dayReqs.length > 3 && <div className="text-[10px] text-gray-400 pl-1">+{dayReqs.length - 3}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {selectedSlot && (
        <BookingModal
          slot={selectedSlot}
          onClose={() => setSelectedSlot(null)}
          onSave={() => {
            setRefetchKey(k => k + 1)
            queryClient.invalidateQueries({ queryKey: ['calendar-requests'] })
            queryClient.refetchQueries({ queryKey: ['calendar-requests'] })
          }}
        />
      )}
    </>
  )
}
