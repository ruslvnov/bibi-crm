'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { RequestWithRelations } from '@/types'

interface ConfirmDialogProps {
  request: RequestWithRelations
  onConfirm: (confirmedDateTime?: string) => void
  onClose: () => void
}

export function ConfirmDialog({ request, onConfirm, onClose }: ConfirmDialogProps) {
  const defaultDate = request.preferredDate ?? ''
  const defaultTime = request.preferredTime ?? ''
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState(defaultTime)

  function handleConfirm() {
    let dt: string | undefined
    if (date && time) {
      dt = new Date(`${date}T${time}:00+06:00`).toISOString()
    }
    onConfirm(dt)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Подтвердить запись</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <p className="text-sm text-gray-600">Пациент: <strong>{request.patient.fullName}</strong></p>
            <p className="text-sm text-gray-600">Услуга: <strong>{request.service}</strong></p>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Дата консультации</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Время</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Пациенту будет отправлено WhatsApp-сообщение с подтверждением.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button onClick={handleConfirm} className="bg-green-600 hover:bg-green-700">Подтвердить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
