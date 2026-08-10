'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatInTimeZone } from 'date-fns-tz'
import { ru } from 'date-fns/locale'
import { StatusBadge } from './StatusBadge'
import { ConfirmDialog } from './dialogs/ConfirmDialog'
import { RescheduleDialog } from './dialogs/RescheduleDialog'
import { RejectDialog } from './dialogs/RejectDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Phone, MessageCircle, Clock, User, MapPin, AlertTriangle, ArrowLeft, Pencil, Check, X } from 'lucide-react'
import { canManageRequests } from '@/lib/auth-client'
import type { RequestWithRelations, SafeUser } from '@/types'
import { RequestStatus } from '@prisma/client'

const TZ = 'Asia/Bishkek'

interface RequestDetailProps {
  request: RequestWithRelations & {
    statusHistory: Array<{
      id: string
      previousStatus: RequestStatus | null
      newStatus: RequestStatus
      comment: string | null
      createdAt: Date
      changedBy?: { id: string; name: string } | null
    }>
    messageLogs?: Array<{
      id: string
      status: string
      messageText: string | null
      errorMessage: string | null
      createdAt: Date
    }>
  }
  currentUser: SafeUser
}

export function RequestDetail({ request, currentUser }: RequestDetailProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showReschedule, setShowReschedule] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [editingConsult, setEditingConsult] = useState(false)
  const [consultForm, setConsultForm] = useState({
    service: request.service,
    complaint: request.complaint ?? '',
    preferredDate: request.preferredDate ?? '',
    preferredTime: request.preferredTime ?? '',
  })
  const [savingConsult, setSavingConsult] = useState(false)
  const [editingPatient, setEditingPatient] = useState(false)
  const [patientForm, setPatientForm] = useState({
    fullName: request.patient.fullName,
    dateOfBirth: (request.patient as Record<string, unknown>).dateOfBirth as string ?? '',
    district: request.patient.district ?? '',
  })
  const [savingPatient, setSavingPatient] = useState(false)
  const canManage = canManageRequests(currentUser.role)

  async function savePatient() {
    setSavingPatient(true)
    try {
      await fetch(`/api/patients/${request.patient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientForm),
      })
      setEditingPatient(false)
      router.refresh()
    } finally {
      setSavingPatient(false)
    }
  }

  async function saveConsult() {
    setSavingConsult(true)
    try {
      await fetch(`/api/consultation-requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(consultForm),
      })
      setEditingConsult(false)
      router.refresh()
    } finally {
      setSavingConsult(false)
    }
  }

  async function doAction(endpoint: string, body?: object) {
    setLoading(true)
    try {
      const res = await fetch(`/api/consultation-requests/${request.id}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      const json = await res.json()
      if (json.success) {
        router.refresh()
        if (json.warning) alert(json.warning)
      } else {
        alert('Ошибка: ' + (json.code ?? 'Неизвестная ошибка'))
      }
    } finally {
      setLoading(false)
    }
  }

  const isTerminal = [RequestStatus.REJECTED, RequestStatus.CANCELLED, RequestStatus.COMPLETED, RequestStatus.NO_SHOW].includes(request.status)
  const isConfirmed = request.status === RequestStatus.CONFIRMED

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{request.patient.fullName}</h1>
          <p className="text-gray-500 text-sm mt-1">Заявка #{request.id.slice(-8).toUpperCase()}</p>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Patient Info */}
        <div className="bg-white rounded-xl border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Информация о пациенте</h2>
            {canManage && !editingPatient && (
              <button onClick={() => setEditingPatient(true)} className="text-gray-400 hover:text-gray-600">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {editingPatient ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">ФИО</label>
                <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={patientForm.fullName} onChange={e => setPatientForm(f => ({ ...f, fullName: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Дата рождения</label>
                <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={patientForm.dateOfBirth} onChange={e => setPatientForm(f => ({ ...f, dateOfBirth: e.target.value }))} placeholder="ДД.ММ.ГГГГ" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Район</label>
                <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={patientForm.district} onChange={e => setPatientForm(f => ({ ...f, district: e.target.value }))} placeholder="Район" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={savePatient} disabled={savingPatient}>
                  <Check className="h-3.5 w-3.5 mr-1" /> {savingPatient ? 'Сохранение...' : 'Сохранить'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setEditingPatient(false); setPatientForm({ fullName: request.patient.fullName, dateOfBirth: (request.patient as Record<string, unknown>).dateOfBirth as string ?? '', district: request.patient.district ?? '' }) }}>
                  <X className="h-3.5 w-3.5 mr-1" /> Отмена
                </Button>
              </div>
            </div>
          ) : (
            <>
              <InfoRow icon={<User className="h-4 w-4" />} label="Имя" value={request.patient.fullName} />
              <InfoRow icon={<Phone className="h-4 w-4" />} label="Телефон" value={request.patient.phone} />
              {(request.patient as Record<string, unknown>).dateOfBirth && (
                <InfoRow label="Дата рождения" value={(request.patient as Record<string, unknown>).dateOfBirth as string} />
              )}
              {request.patient.district && <InfoRow icon={<MapPin className="h-4 w-4" />} label="Район" value={request.patient.district} />}
              {request.patient.preferredLanguage && <InfoRow icon={<MessageCircle className="h-4 w-4" />} label="Язык" value={request.patient.preferredLanguage} />}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={`https://wa.me/${request.patient.normalizedPhone?.replace('+', '')}`} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    WhatsApp
                  </a>
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(request.patient.phone)}>
                  <Phone className="h-4 w-4 mr-2" />
                  Копировать
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Consultation Info */}
        <div className="bg-white rounded-xl border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Детали консультации</h2>
            {canManage && !editingConsult && (
              <button onClick={() => setEditingConsult(true)} className="text-gray-400 hover:text-gray-600">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {editingConsult ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Услуга</label>
                <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={consultForm.service} onChange={e => setConsultForm(f => ({ ...f, service: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Жалоба</label>
                <textarea className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={2}
                  value={consultForm.complaint} onChange={e => setConsultForm(f => ({ ...f, complaint: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-600">Дата</label>
                  <input type="date" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={consultForm.preferredDate} onChange={e => setConsultForm(f => ({ ...f, preferredDate: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Время</label>
                  <input type="time" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={consultForm.preferredTime} onChange={e => setConsultForm(f => ({ ...f, preferredTime: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={saveConsult} disabled={savingConsult}>
                  <Check className="h-3.5 w-3.5 mr-1" /> {savingConsult ? 'Сохранение...' : 'Сохранить'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingConsult(false)}>
                  <X className="h-3.5 w-3.5 mr-1" /> Отмена
                </Button>
              </div>
            </div>
          ) : (
            <>
              <InfoRow label="Услуга" value={request.service} />
              {request.complaint && <InfoRow label="Жалоба" value={request.complaint} />}
              {request.missingTeethCount != null && <InfoRow label="Кол-во зубов" value={String(request.missingTeethCount)} />}
              {request.jaw && <InfoRow label="Челюсть" value={request.jaw === 'upper' ? 'Верхняя' : request.jaw === 'lower' ? 'Нижняя' : 'Обе'} />}
              {request.missingDuration && <InfoRow label="Срок отсутствия" value={request.missingDuration} />}
              {request.rootsRemaining != null && <InfoRow label="Корни остались" value={request.rootsRemaining ? 'Да' : 'Нет'} />}
              {request.preferredDate && (
                <InfoRow icon={<Clock className="h-4 w-4" />} label="Желаемая дата/время"
                  value={`${request.preferredDate} ${request.preferredTime ?? ''}`} />
              )}
              {request.rescheduleSuggestedDateTime && (
                <InfoRow label="Предложено время"
                  value={formatInTimeZone(request.rescheduleSuggestedDateTime, TZ, 'dd.MM.yyyy HH:mm', { locale: ru })} />
              )}
              {request.rejectionReason && (
                <div className="flex items-start gap-2 p-2 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-red-600">Причина отклонения</p>
                    <p className="text-sm text-red-700">{request.rejectionReason}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      {canManage && !isTerminal && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Действия</h2>
          <div className="flex flex-wrap gap-3">
            {!isConfirmed && (
              <Button onClick={() => setShowConfirm(true)} disabled={loading} className="bg-green-600 hover:bg-green-700">
                Подтвердить
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowReschedule(true)} disabled={loading}>
              Предложить другое время
            </Button>
            <Button variant="outline" onClick={() => setShowReject(true)} disabled={loading} className="text-red-600 border-red-200 hover:bg-red-50">
              Отклонить
            </Button>
            <Button variant="outline" onClick={() => doAction('cancel')} disabled={loading} className="text-gray-600">
              Отменить
            </Button>
            {isConfirmed && (
              <>
                <Button variant="outline" onClick={() => doAction('complete')} disabled={loading} className="text-purple-600">
                  Пришёл ✓
                </Button>
                <Button variant="outline" onClick={() => doAction('no-show')} disabled={loading} className="text-orange-600">
                  Не пришёл
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Status History */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold text-gray-900 mb-4">История изменений</h2>
        <div className="space-y-3">
          {request.statusHistory.map((h) => (
            <div key={h.id} className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={h.newStatus} />
                  {h.changedBy && <span className="text-xs text-gray-500">· {h.changedBy.name}</span>}
                  <span className="text-xs text-gray-400">
                    · {formatInTimeZone(h.createdAt, TZ, 'dd.MM.yyyy HH:mm', { locale: ru })}
                  </span>
                </div>
                {h.comment && <p className="text-sm text-gray-600 mt-1">{h.comment}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dialogs */}
      {showConfirm && (
        <ConfirmDialog
          request={request}
          onConfirm={(dt) => { setShowConfirm(false); doAction('confirm', { confirmedDateTime: dt }) }}
          onClose={() => setShowConfirm(false)}
        />
      )}
      {showReschedule && (
        <RescheduleDialog
          onConfirm={(dt) => { setShowReschedule(false); doAction('reschedule', { suggestedDateTime: dt }) }}
          onClose={() => setShowReschedule(false)}
        />
      )}
      {showReject && (
        <RejectDialog
          onConfirm={(reason) => { setShowReject(false); doAction('reject', { reason, sendMessage: true }) }}
          onClose={() => setShowReject(false)}
        />
      )}
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="text-gray-400 mt-0.5">{icon}</span>}
      <div className="flex-1">
        <span className="text-xs text-gray-400">{label}</span>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  )
}
