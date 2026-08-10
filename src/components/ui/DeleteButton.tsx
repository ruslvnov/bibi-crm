'use client'

import { useState } from 'react'
import { Trash2, X } from 'lucide-react'

interface DeleteButtonProps {
  onConfirm: () => Promise<void>
  label?: string
  confirmText?: string
  className?: string
  iconOnly?: boolean
}

export function DeleteButton({ onConfirm, label = 'Удалить', confirmText = 'Удалить', className = '', iconOnly = false }: DeleteButtonProps) {
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
      setConfirm(false)
    }
  }

  if (confirm) {
    return (
      <span className="inline-flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 font-medium"
        >
          {loading ? '...' : confirmText}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="text-xs px-1 py-1 rounded text-gray-500 hover:bg-gray-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={e => { e.stopPropagation(); setConfirm(true) }}
      className={`inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors ${className}`}
      title={label}
    >
      <Trash2 className="h-3.5 w-3.5" />
      {!iconOnly && <span>{label}</span>}
    </button>
  )
}
