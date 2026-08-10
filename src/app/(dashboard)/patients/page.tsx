import { Suspense } from 'react'
import { PatientsTable } from '@/components/patients/PatientsTable'

export default function PatientsPage() {
  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <PatientsTable />
    </Suspense>
  )
}
