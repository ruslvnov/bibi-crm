'use client'

import { useState, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { RequestStatus } from '@prisma/client'
import { STATUS_CONFIG } from './StatusBadge'
import { ChevronDown } from 'lucide-react'

const QUICK_STATUSES: RequestStatus[] = [
  RequestStatus.CONFIRMED,
  RequestStatus.COMPLETED,
  RequestStatus.NO_SHOW,
  RequestStatus.RESCHEDULE_PROPOSED,
  RequestStatus.CANCELLED,
]

interface StatusSelectProps {
  requestId: string
  status: RequestStatus
  onUpdated?: (newStatus: RequestStatus) => void
}

export function StatusSelect({ requestId, status, onUpdated }: StatusSelectProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function changeStatus(newStatus: RequestStatus) {
    if (newStatus === status || loading) return
    setLoading(true)
    setOpen(false)
    try {
      const res = await fetch(`/api/consultation-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        onUpdated?.(newStatus)
        queryClient.invalidateQueries({ queryKey: ['consultation-requests'] })
        queryClient.invalidateQueries({ queryKey: ['calendar-requests'] })
        queryClient.invalidateQueries({ queryKey: ['patients'] })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={ref} className="relative inline-block" onClick={e => e.stopPropagation()}>
      <button
        disabled={loading}
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${config.className} ${loading ? 'opacity-50' : 'cursor-pointer hover:opacity-80'}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot} flex-shrink-0`} />
        {config.label}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border rounded-xl shadow-lg py-1 min-w-[150px]">
          {QUICK_STATUSES.map(s => {
            const c = STATUS_CONFIG[s]
            return (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 ${s === status ? 'font-semibold' : ''}`}
              >
                <span className={`w-2 h-2 rounded-full ${c.dot} flex-shrink-0`} />
                {c.label}
                {s === status && <span className="ml-auto text-gray-400">✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
