import Link from 'next/link'
import { ReactNode } from 'react'

export function Cards({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return (
    <div className={`my-6 grid gap-3 ${cols === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
      {children}
    </div>
  )
}

export function Card({
  href,
  title,
  icon,
  description,
}: {
  href: string
  title: string
  icon?: string
  description?: string
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-xl border border-gray-800 bg-gray-900/60 p-4 hover:border-indigo-500/50 hover:bg-gray-900 transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          <span className="font-semibold text-gray-100 text-sm">{title}</span>
        </div>
        <span className="text-gray-600 group-hover:text-indigo-400 transition-colors text-xs">→</span>
      </div>
      {description && <p className="text-xs text-gray-400 leading-relaxed">{description}</p>}
    </Link>
  )
}
