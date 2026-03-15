'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserIcon, CreditCardIcon, LogOutIcon, BarChart2Icon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface UserMenuDropdownProps {
  user: {
    name?: string | null
    email?: string | null
    avatarUrl?: string | null
  } | null
}

export function UserMenuDropdown({ user }: UserMenuDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { logout } = useAuth()

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const navigate = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <div ref={ref} className="relative">
      {/* Avatar trigger button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Open user menu"
        aria-expanded={open}
        aria-haspopup="true"
        className="w-8 h-8 rounded-full bg-forge-700 flex items-center justify-center text-sm font-bold text-white cursor-pointer hover:ring-2 hover:ring-forge-500 focus:outline-none focus:ring-2 focus:ring-forge-500 transition-all overflow-hidden"
      >
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          user?.name?.[0]?.toUpperCase() ?? '?'
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-10 z-50 w-56 rounded-xl border border-gray-700 bg-gray-900 shadow-2xl shadow-black/60 overflow-hidden">
          {/* Identity header */}
          <div className="px-4 py-3 border-b border-gray-700/80">
            <p className="text-sm font-semibold text-white truncate">{user?.name ?? 'User'}</p>
            <p className="text-xs text-gray-400 truncate mt-0.5">{user?.email ?? ''}</p>
          </div>

          {/* Main items */}
          <div className="py-1">
            <MenuItem
              icon={<UserIcon className="w-4 h-4" />}
              label="View profile"
              onClick={() => navigate('/dashboard/profile')}
            />
            <MenuItem
              icon={<CreditCardIcon className="w-4 h-4" />}
              label="Account & billing"
              onClick={() => navigate('/dashboard/account')}
            />
            <MenuItem
              icon={<BarChart2Icon className="w-4 h-4" />}
              label="Analytics"
              onClick={() => navigate('/analytics')}
            />
          </div>

          {/* Sign out */}
          <div className="border-t border-gray-700/80 py-1">
            <MenuItem
              icon={<LogOutIcon className="w-4 h-4" />}
              label="Sign out"
              onClick={() => { setOpen(false); logout() }}
              danger
            />
          </div>
        </div>
      )}
    </div>
  )
}

function MenuItem({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left',
        danger
          ? 'text-red-400 hover:bg-red-950/40 hover:text-red-300'
          : 'text-gray-200 hover:bg-gray-800 hover:text-white',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  )
}
