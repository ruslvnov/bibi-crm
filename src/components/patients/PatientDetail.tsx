'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { formatInTimeZone } from 'date-fns-tz'
import { Phone, MapPin, ArrowLeft, Calendar, Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/requests/StatusBadge'
import { StatusSelect } from '@/components/requests/StatusSelect'
import { RequestStatus } from '@prisma/client'
import { formatDistanceToNow } from 'date-fns'

const TZ = 'Asia/Bishkek'

type Request = {
  id: string
  service: string
  complaint?: string | null
  preferredDate?: string | null
  preferredTime?: string | null
  preferredDateTime?: string | null
  status: RequestStatus
  createdAt: string
}

type Patient = {
  id: string
  fullName: string
  phone: string
  dateOfBirth?: string | null
  district?: string | null
  preferredLanguage?: string | null
  createdAt: string
  consultationRequests: Request[]
}

export function PatientDetail({ patient: initial }: { patient: Patient }) {
  const router = useRouter()
  const [patient, setPatient] = useState(initial)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ fullName: initial.fullName, dateOfBirth: initial.dateOfBirth ?? '', district: initial.district ?? '' })
  const [saving, setSaving] = useState(false)

  async function savePatient() {
    setSaving(true)
    try {
      const res = await fetch(`/api/patients/${patient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const { data } = await res.json()
        setPatient(p => ({ ...p, ...data }))
        setEditing(false)
      }
    } finally {
      setSaving(false)
    }
  }

  function cancelEdit() {
    setForm({ fullName: patient.fullName, dateOfBirth: patient.dateOfBirth ?? '', district: patient.district ?? '' })
    setEditing(false)
  }

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{patient.fullName}</h1>
          <p className="text-gray-500 text-sm">Пациент</p>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" /> Редактировать
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contacts / edit */}
        <div className="bg-white rounded-xl border p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Контакты</h2>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">ФИО</label>
                <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Дата рождения</label>
                <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} placeholder="ДД.ММ.ГГГГ" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Район</label>
                <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} placeholder="Район" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={savePatient} disabled={saving}>
                  <Check className="h-3.5 w-3.5 mr-1" /> {saving ? 'Сохранение...' : 'Сохранить'}
                </Button>
                <Button size="sm" variant="outline" onClick={cancelEdit}><X className="h-3.5 w-3.5 mr-1" /> Отмена</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="font-mono">{patient.phone}</span>
              </div>
              {patient.dateOfBirth && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>Дата рождения: {patient.dateOfBirth}</span>
                </div>
              )}
              {patient.district && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{patient.district}</span>
                </div>
              )}
              {patient.preferredLanguage && (
                <div className="text-sm text-gray-500">Язык: {patient.preferredLanguage}</div>
              )}
              <div className="text-xs text-gray-400">
                Добавлен: {formatDistanceToNow(new Date(patient.createdAt), { addSuffix: true, locale: ru })}
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Статистика</h2>
          <div className="text-3xl font-bold text-blue-600">{patient.consultationRequests.length}</div>
          <div className="text-sm text-gray-500">заявок всего</div>
        </div>
      </div>

      {/* Appointment history */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold text-gray-900 mb-4">История заявок</h2>
        {patient.consultationRequests.length === 0 && (
          <p className="text-gray-500 text-sm">Нет заявок</p>
        )}
        <div className="space-y-3">
          {patient.consultationRequests.map((req) => (
            <div key={req.id} className="rounded-lg p-3 border hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Link href={`/requests/${req.id}`} className="font-medium text-gray-900 hover:underline block truncate">
                    {req.service}
                  </Link>
                  {req.preferredDateTime ? (
                    <p className="text-sm text-gray-500 mt-0.5">
                      {formatInTimeZone(new Date(req.preferredDateTime), TZ, 'HH:mm, d MMMM yyyy', { locale: ru })}
                    </p>
                  ) : req.preferredDate ? (
                    <p className="text-sm text-gray-500 mt-0.5">{req.preferredDate} {req.preferredTime}</p>
                  ) : null}
                </div>
                <StatusSelect requestId={req.id} status={req.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
