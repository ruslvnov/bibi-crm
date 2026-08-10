'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface RescheduleDialogProps {
  onConfirm: (suggestedDateTime: string) => void
  onClose: () => void
}

export function RescheduleDialog({ onConfirm, onClose }: RescheduleDialogProps) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')

  function handleConfirm() {
    if (!date || !time) return
    const dt = new Date(`${date}T${time}:00+06:00`).toISOString()
    onConfirm(dt)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Предложить другое время</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-gray-600">Выберите время, которое вы хотите предложить пациенту.</p>
          <div>
            <Label>Дата</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Время</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <p className="text-xs text-gray-500">Пациенту будет отправлено сообщение с предложенным временем.</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button onClick={handleConfirm} disabled={!date || !time}>Отправить предложение</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
