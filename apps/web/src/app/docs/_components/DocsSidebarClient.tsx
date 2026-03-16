'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const NAV = [
  {
    group: 'Introduction',
    items: [
      { label: 'Welcome to Forge AI', href: '/docs/introduction/welcome' },
      { label: 'Quickstart',           href: '/docs/introduction/quickstart' },
      { label: 'FAQ',                  href: '/docs/introduction/faq' },
    ],
  },
  {
    group: 'Features',
    items: [
      { label: 'AI Chat',             href: '/docs/features/ai-chat' },
      { label: 'Code Editor',         href: '/docs/features/code-editor' },
      { label: 'Live Preview',        href: '/docs/features/live-preview' },
      { label: 'Templates',           href: '/docs/features/templates' },
      { label: 'Version History',     href: '/docs/features/version-history' },
      { label: 'GitHub Sync',         href: '/docs/features/github-sync' },
      { label: 'Deploy',              href: '/docs/features/deploy' },
      { label: 'Team Collaboration',  href: '/docs/features/collaboration' },
    ],
  },
  {
    group: 'Guides',
    items: [
      { label: 'Prompting Tips',        href: '/docs/guides/prompting-tips' },
      { label: 'Building a SaaS App',   href: '/docs/guides/building-saas' },
      { label: 'Building a Landing Page', href: '/docs/guides/building-landing' },
      { label: 'Building a Dashboard',  href: '/docs/guides/building-dashboard' },
    ],
  },
  {
    group: 'Workspace',
    items: [
      { label: 'Managing Projects',  href: '/docs/workspace/projects' },
      { label: 'Members & Roles',    href: '/docs/workspace/members-roles' },
      { label: 'Billing & Plans',    href: '/docs/workspace/billing' },
    ],
  },
  {
    group: 'Reference',
    items: [
      { label: 'Keyboard Shortcuts',    href: '/docs/reference/keyboard-shortcuts' },
      { label: 'Supported Frameworks',  href: '/docs/reference/supported-frameworks' },
      { label: 'AI Models',             href: '/docs/reference/ai-models' },
    ],
  },
]

export const ALL_PAGES = NAV.flatMap(g => g.items)

export function DocsSidebarClient() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const sidebarContent = (
    <nav className="px-3 py-4 space-y-6">
      {NAV.map(group => (
        <div key={group.group}>
          <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            {group.group}
          </p>
          <ul className="space-y-0.5">
            {group.items.map(item => {
              const active = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block px-3 py-1.5 rounded-md text-sm transition-colors ${
                      active
                        ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                        : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/60'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(v => !v)}
        className="lg:hidden fixed bottom-4 right-4 z-50 w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center shadow-xl text-white"
        aria-label="Toggle navigation"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          {mobileOpen
            ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={`lg:hidden fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 border-r border-gray-800 overflow-y-auto transform transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:block w-60 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto border-r border-gray-800 bg-gray-950">
        {sidebarContent}
      </div>
    </>
  )
}
