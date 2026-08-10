import type { DashboardStats } from '@/types'

interface StatCardProps {
  label: string
  value: number
  color: string
  emoji: string
}

function StatCard({ label, value, color, emoji }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{emoji}</span>
        <span className={`text-3xl font-bold ${color}`}>{value}</span>
      </div>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
    </div>
  )
}

interface DashboardStatsProps {
  stats: DashboardStats
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <StatCard label="Новые заявки" value={stats.pending} color="text-yellow-600" emoji="⏳" />
      <StatCard label="Подтв. сегодня" value={stats.confirmedToday} color="text-green-600" emoji="✅" />
      <StatCard label="Перенос предложен" value={stats.rescheduleProposed} color="text-blue-600" emoji="🔄" />
      <StatCard label="Отменены" value={stats.cancelled} color="text-gray-500" emoji="❌" />
      <StatCard label="Не пришли" value={stats.noShow} color="text-orange-600" emoji="👻" />
      <StatCard label="Всего заявок" value={stats.total} color="text-gray-900" emoji="📋" />
    </div>
  )
}
