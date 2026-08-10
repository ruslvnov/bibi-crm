'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Bell, LogOut, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { SafeUser } from '@/types'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Главная',
  '/requests': 'Заявки',
  '/patients': 'Пациенты',
  '/calendar': 'Календарь',
  '/history': 'История',
  '/settings': 'Настройки',
  '/users': 'Пользователи',
}

interface TopBarProps {
  user: SafeUser
  onMenuClick?: () => void
}

export function TopBar({ user, onMenuClick }: TopBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname] ?? PAGE_TITLES[Object.keys(PAGE_TITLES).find(k => k !== '/' && pathname.startsWith(k)) ?? ''] ?? ''

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetch('/api/notifications').then((r) => r.json()),
    refetchInterval: 15_000,
  })

  const unread = notifData?.unreadCount ?? 0

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-14 bg-white border-b flex items-center justify-between px-3 md:px-6 flex-shrink-0">
      <div className="flex items-center gap-2">
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          onClick={onMenuClick}
          aria-label="Открыть меню"
        >
          <Menu className="h-5 w-5 text-gray-600" />
        </button>
        <h1 className="text-base md:text-lg font-bold text-gray-900">{title}</h1>
      </div>

      <div className="flex items-center gap-1 md:gap-3">
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell className="h-5 w-5 text-gray-600" />
          {unread > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500 hover:bg-red-500">
              {unread > 9 ? '9+' : unread}
            </Badge>
          )}
        </button>

        <div className="hidden md:flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-400">{user.role}</p>
          </div>
        </div>

        <Button variant="ghost" size="icon" onClick={logout} title="Выйти">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
