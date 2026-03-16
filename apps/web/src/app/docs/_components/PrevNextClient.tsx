'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ALL_PAGES } from './DocsSidebarClient'

export function PrevNextClient() {
  const pathname = usePathname()
  const idx = ALL_PAGES.findIndex(p => p.href === pathname)
  const prev = idx > 0 ? ALL_PAGES[idx - 1] : null
  const next = idx < ALL_PAGES.length - 1 ? ALL_PAGES[idx + 1] : null

  if (!prev && !next) return null

  return (
    <nav className="mt-16 pt-8 border-t border-gray-800 flex items-center justify-between gap-4">
      {prev ? (
        <Link
          href={prev.href}
          className="group flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900/50 hover:border-indigo-500/50 hover:bg-gray-900 transition-all px-4 py-3 max-w-xs"
        >
          <span className="text-gray-500 group-hover:text-indigo-400 transition-colors text-lg">←</span>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Previous</p>
            <p className="text-sm text-gray-200 font-medium leading-tight">{prev.label}</p>
          </div>
        </Link>
      ) : <div />}

      {next ? (
        <Link
          href={next.href}
          className="group flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900/50 hover:border-indigo-500/50 hover:bg-gray-900 transition-all px-4 py-3 max-w-xs text-right ml-auto"
        >
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Next</p>
            <p className="text-sm text-gray-200 font-medium leading-tight">{next.label}</p>
          </div>
          <span className="text-gray-500 group-hover:text-indigo-400 transition-colors text-lg">→</span>
        </Link>
      ) : <div />}
    </nav>
  )
}
