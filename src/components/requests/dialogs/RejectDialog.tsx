'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const REASONS = [
  'Нет свободного времени',
  'Услуга временно недоступна',
  'Дубликат заявки',
  'Некорректные данные пациента',
  'Другое',
]

interface RejectDialogProps {
  onConfirm: (reason: string) => void
  onClose: () => void
}

export function RejectDialog({ onConfirm, onClose }: RejectDialogProps) {
  const [preset, setPreset] = useState('')
  const [custom, setCustom] = useState('')

  const reason = preset === 'Другое' ? custom : preset

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Отклонить заявку</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Причина отклонения</Label>
            <Select value={preset} onValueChange={setPreset}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите причину..." />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {preset === 'Другое' && (
            <div>
              <Label>Укажите причину</Label>
              <Input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Введите причину..."
              />
            </div>
          )}

          <p className="text-xs text-gray-500">
            Пациенту будет отправлено вежливое уведомление об отклонении.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button
            onClick={() => onConfirm(reason)}
            disabled={!reason}
            className="bg-red-600 hover:bg-red-700"
          >
            Отклонить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
