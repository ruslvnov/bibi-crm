'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useState, useEffect } from 'react'
import { format, addDays, subDays, isToday, isYesterday, isTomorrow } from 'date-fns'
import { ru } from 'date-fns/locale'

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Новая' },
  { value: 'CONFIRMED', label: 'Подтверждён' },
  { value: 'COMPLETED', label: 'Пришёл' },
  { value: 'NO_SHOW', label: 'Не пришёл' },
  { value: 'RESCHEDULE_PROPOSED', label: 'Перенос' },
  { value: 'CANCELLED', label: 'Отменена' },
  { value: 'REJECTED', label: 'Отклонена' },
]

function todayStr() { return format(new Date(), 'yyyy-MM-dd') }

function dateLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  if (isToday(d)) return 'Сегодня'
  if (isYesterday(d)) return 'Вчера'
  if (isTomorrow(d)) return 'Завтра'
  return format(d, 'd MMMM yyyy', { locale: ru })
}

export function RequestsFilters() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [search, setSearch] = useState(searchParams.get('search') ?? '')

  // Set today's date as default on first mount if no date is set
  useEffect(() => {
    if (!searchParams.has('dateFrom')) {
      const params = new URLSearchParams(searchParams.toString())
      const today = todayStr()
      params.set('dateFrom', today)
      params.set('dateTo', today)
      router.replace(`?${params}`)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const currentDate = searchParams.get('dateFrom') ?? todayStr()
  const allDates = searchParams.get('dateFrom') === null && searchParams.get('dateTo') === null

  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') params.set(key, value)
    else params.delete(key)
    params.delete('page')
    router.push(`?${params}`)
  }, [searchParams, router])

  function setDate(dateStr: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('dateFrom', dateStr)
    params.set('dateTo', dateStr)
    params.delete('page')
    router.push(`?${params}`)
  }

  function shiftDate(delta: number) {
    const d = new Date(currentDate + 'T00:00:00')
    setDate(format(delta > 0 ? addDays(d, 1) : subDays(d, 1), 'yyyy-MM-dd'))
  }

  function showAllDates() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('dateFrom')
    params.delete('dateTo')
    params.delete('page')
    router.push(`?${params}`)
  }

  const handleSearch = () => updateFilter('search', search)

  const hasExtraFilters = searchParams.has('status') || searchParams.has('search')

  return (
    <div className="space-y-3">
      {/* Date navigation */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-white border rounded-lg p-1">
          <button onClick={() => shiftDate(-1)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 text-sm font-semibold text-gray-900 min-w-[130px] text-center">
            {allDates ? 'Все даты' : dateLabel(currentDate)}
          </span>
          <button onClick={() => shiftDate(1)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <input
          type="date"
          value={allDates ? '' : currentDate}
          onChange={e => e.target.value && setDate(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-9"
        />

        <Button variant={!allDates && isToday(new Date(currentDate + 'T00:00:00')) ? 'default' : 'outline'}
          size="sm" onClick={() => setDate(todayStr())}>
          Сегодня
        </Button>
        <Button variant={allDates ? 'default' : 'outline'} size="sm" onClick={showAllDates}>
          Все даты
        </Button>
      </div>

      {/* Other filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-2">
          <Input placeholder="Поиск по имени или телефону..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="w-full md:w-64" />
          <Button variant="outline" size="icon" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <Select value={searchParams.get('status') ?? 'all'} onValueChange={(v) => updateFilter('status', v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Все статусы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasExtraFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); const p = new URLSearchParams(); const d = todayStr(); p.set('dateFrom', d); p.set('dateTo', d); router.push(`?${p}`) }} className="text-gray-500">
            <X className="h-4 w-4 mr-1" /> Сбросить
          </Button>
        )}
      </div>
    </div>
  )
}
