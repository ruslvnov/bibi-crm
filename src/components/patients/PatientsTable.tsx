'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Plus, X, Phone, MapPin, Calendar, ChevronRight, Users } from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { DeleteButton } from '@/components/ui/DeleteButton'
import { RequestStatus } from '@prisma/client'

const TZ = 'Asia/Bishkek'

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
  'bg-rose-500', 'bg-amber-500', 'bg-cyan-500',
  'bg-indigo-500', 'bg-teal-500',
]

function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length
  return AVATAR_COLORS[Math.abs(h)]
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

type PatientRow = {
  id: string
  fullName: string
  phone: string
  dateOfBirth?: string | null
  district?: string | null
  _count?: { consultationRequests: number }
  createdAt: string
  consultationRequests?: { id: string; status: RequestStatus; preferredDateTime?: string | null; service: string }[]
}

function AddPatientModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ fullName: '', phone: '', dateOfBirth: '', district: '', service: '', complaint: '', date: '', time: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function field(key: keyof typeof form, label: string, placeholder = '', type = 'text', required = false) {
    return (
      <div>
        <label className="text-xs font-medium text-gray-700">{label}{required ? ' *' : ''}</label>
        <input type={type}
          className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder} required={required} />
      </div>
    )
  }

  async function save(withBooking: boolean) {
    if (!form.fullName || !form.phone) { setError('ФИО и телефон обязательны'); return }
    if (withBooking && (!form.service || !form.date || !form.time)) { setError('Для записи укажите услугу, дату и время'); return }
    setLoading(true); setError('')
    try {
      if (withBooking) {
        const res = await fetch('/api/admin/bookings', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName: form.fullName, phone: form.phone, dateOfBirth: form.dateOfBirth, service: form.service, complaint: form.complaint, date: form.date, time: form.time }),
        })
        if (!res.ok) { const d = await res.json(); setError(d.error || 'Ошибка'); return }
      } else {
        const res = await fetch('/api/patients', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName: form.fullName, phone: form.phone, dateOfBirth: form.dateOfBirth, district: form.district }),
        })
        if (!res.ok) { const d = await res.json(); setError(d.error || 'Ошибка'); return }
      }
      onSaved(); onClose()
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-gray-900">Новый пациент</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Данные пациента</p>
          {field('fullName', 'ФИО', 'Иванов Иван Иванович', 'text', true)}
          {field('phone', 'Телефон', '+996 XXX XXX XXX', 'text', true)}
          {field('dateOfBirth', 'Дата рождения', 'ДД.ММ.ГГГГ')}
          {field('district', 'Район', 'Октябрьский...')}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-2">Запись (необязательно)</p>
          {field('service', 'Услуга', 'Консультация, имплантация...')}
          {field('complaint', 'Жалоба', 'Опишите проблему...')}
          <div className="grid grid-cols-2 gap-2">
            {field('date', 'Дата', '', 'date')}
            {field('time', 'Время', '', 'time')}
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2 pt-2 border-t">
            <Button variant="outline" className="flex-1" onClick={() => save(false)} disabled={loading}>
              {loading ? '...' : 'Добавить в базу'}
            </Button>
            <Button className="flex-1" onClick={() => save(true)} disabled={loading}>
              {loading ? '...' : 'Записать'}
            </Button>
          </div>
          <p className="text-[10px] text-gray-400 text-center">«Добавить в базу» — только карточка. «Записать» — карточка + запись в календарь.</p>
        </div>
      </div>
    </div>
  )
}

export function PatientsTable() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [showAdd, setShowAdd] = useState(false)
  const page = Number(searchParams.get('page') ?? '1')
  const params = new URLSearchParams(searchParams.toString())

  const { data, isLoading } = useQuery({
    queryKey: ['patients', params.toString()],
    queryFn: () => fetch(`/api/patients?${params}`).then(r => r.json()),
    refetchInterval: 20_000,
  })

  const patients: PatientRow[] = data?.data ?? []
  const total: number = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1

  const handleSearch = () => {
    const p = new URLSearchParams(searchParams.toString())
    if (search) p.set('search', search); else p.delete('search')
    p.delete('page')
    router.push(`?${p}`)
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex gap-2">
            <Input placeholder="Поиск по имени или телефону..."
              value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()} className="w-72" />
            <Button variant="outline" size="icon" onClick={handleSearch}><Search className="h-4 w-4" /></Button>
          </div>
          {total > 0 && (
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <Users className="h-4 w-4" />{total} пациент{total % 10 === 1 && total % 100 !== 11 ? '' : total % 10 >= 2 && total % 10 <= 4 && (total % 100 < 10 || total % 100 >= 20) ? 'а' : 'ов'}
            </span>
          )}
        </div>
        <Button onClick={() => setShowAdd(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Добавить пациента
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-36 bg-white rounded-xl border animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && patients.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Users className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-base font-medium">Пациенты не найдены</p>
          <p className="text-sm mt-1">Добавьте первого пациента</p>
        </div>
      )}

      {/* Cards grid grouped by first letter */}
      {!isLoading && patients.length > 0 && (() => {
        const groups: { letter: string; items: PatientRow[] }[] = []
        for (const p of patients) {
          const letter = p.fullName.trim()[0]?.toUpperCase() ?? '#'
          const last = groups[groups.length - 1]
          if (last && last.letter === letter) last.items.push(p)
          else groups.push({ letter, items: [p] })
        }
        return groups.map(({ letter, items }) => (
          <div key={letter} className="space-y-3">
            {/* Letter divider */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-gray-500">{letter}</span>
              </div>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            {/* Cards for this letter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map(p => {
            const lastReq = p.consultationRequests?.[0]
            const visitCount = p._count?.consultationRequests ?? 0
            const color = avatarColor(p.fullName)

            return (
              <div
                key={p.id}
                className="bg-white rounded-xl border hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group flex flex-col"
                onClick={() => router.push(`/patients/${p.id}`)}
              >
                {/* Card header */}
                <div className="p-4 flex items-start gap-3">
                  <div className={`${color} rounded-full w-11 h-11 flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                    {initials(p.fullName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-gray-900 leading-snug truncate">{p.fullName}</h3>
                      <span className={`flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${visitCount > 0 ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                        {visitCount} {visitCount === 1 ? 'визит' : visitCount >= 2 && visitCount <= 4 ? 'визита' : 'визитов'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                      <Phone className="h-3 w-3 flex-shrink-0" />
                      <span className="font-mono">{p.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Meta row */}
                {(p.dateOfBirth || p.district) && (
                  <div className="px-4 pb-2 flex flex-wrap gap-x-3 gap-y-0.5">
                    {p.dateOfBirth && (
                      <span className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Calendar className="h-3 w-3" />{p.dateOfBirth}
                      </span>
                    )}
                    {p.district && (
                      <span className="flex items-center gap-1 text-[11px] text-gray-400">
                        <MapPin className="h-3 w-3" />{p.district}
                      </span>
                    )}
                  </div>
                )}

                {/* Last visit */}
                <div className="mt-auto border-t px-4 py-2.5 flex items-center justify-between gap-2">
                  {lastReq ? (
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{lastReq.service}</p>
                      {lastReq.preferredDateTime && (
                        <p className="text-[11px] text-gray-400">
                          {formatInTimeZone(new Date(lastReq.preferredDateTime), TZ, 'd MMM yyyy, HH:mm', { locale: ru })}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Нет записей</p>
                  )}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div onClick={e => e.stopPropagation()}>
                      <DeleteButton
                        iconOnly
                        label="Удалить пациента"
                        onConfirm={async () => {
                          await fetch(`/api/patients/${p.id}`, { method: 'DELETE' })
                          queryClient.invalidateQueries({ queryKey: ['patients'] })
                        }}
                      />
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
                  </div>
                </div>
              </div>
            )
          })}
            </div>
          </div>
        ))
      })()}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-2">
          <p className="text-sm text-gray-500">Страница {page} из {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1}
              onClick={() => { const p = new URLSearchParams(searchParams.toString()); p.set('page', String(page - 1)); router.push(`?${p}`) }}>
              Назад
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages}
              onClick={() => { const p = new URLSearchParams(searchParams.toString()); p.set('page', String(page + 1)); router.push(`?${p}`) }}>
              Вперёд
            </Button>
          </div>
        </div>
      )}

      {showAdd && <AddPatientModal onClose={() => setShowAdd(false)} onSaved={() => queryClient.invalidateQueries({ queryKey: ['patients'] })} />}
    </div>
  )
}
