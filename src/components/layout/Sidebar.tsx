'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, ClipboardList, Users, Calendar, History, Settings, X } from 'lucide-react'
import { UserRole } from '@prisma/client'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  ownerOnly?: boolean
}

const navItems: NavItem[] = [
  { href: '/', label: 'Главная', icon: LayoutDashboard },
  { href: '/requests', label: 'Заявки', icon: ClipboardList },
  { href: '/patients', label: 'Пациенты', icon: Users },
  { href: '/calendar', label: 'Календарь', icon: Calendar },
  { href: '/history', label: 'История', icon: History },
  { href: '/settings', label: 'Настройки', icon: Settings, ownerOnly: true },
]

interface SidebarProps {
  role: UserRole
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ role, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const items = navItems.filter((item) => !item.ownerOnly || role === UserRole.OWNER)

  return (
    <aside
      className={cn(
        'bg-white border-r flex flex-col z-50 transition-transform duration-300 ease-in-out',
        'fixed inset-y-0 left-0 w-[220px]',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        'md:relative md:w-44 md:translate-x-0 md:flex-shrink-0',
      )}
    >
      <div className="h-14 px-4 border-b flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">🦷</span>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">{process.env.NEXT_PUBLIC_CLINIC_NAME || 'CRM'}</p>
            <p className="text-[10px] text-gray-400">Управление заявками</p>
          </div>
        </div>
        <button
          className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t text-[10px] text-gray-400 text-center flex-shrink-0">
        {process.env.NEXT_PUBLIC_CLINIC_NAME || 'CRM'} v1.0
      </div>
    </aside>
  )
}
