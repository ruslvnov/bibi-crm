import { Suspense } from 'react'
import { RequestsTable } from '@/components/requests/RequestsTable'
import { RequestsFilters } from '@/components/requests/RequestsFilters'

export default function RequestsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Все заявки</h1>
        <p className="text-gray-500 mt-1">Управление заявками на консультацию</p>
      </div>
      <Suspense fallback={<div>Загрузка...</div>}>
        <RequestsFilters />
        <RequestsTable />
      </Suspense>
    </div>
  )
}
