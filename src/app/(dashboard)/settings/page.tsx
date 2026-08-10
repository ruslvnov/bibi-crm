import { requireRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { YCloudSettings } from '@/components/dashboard/YCloudSettings'

export default async function SettingsPage() {
  try {
    await requireRole('OWNER')
  } catch {
    redirect('/')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Настройки</h1>
        <p className="text-gray-500 mt-1">Настройка интеграций и системы</p>
      </div>
      <YCloudSettings />
    </div>
  )
}
