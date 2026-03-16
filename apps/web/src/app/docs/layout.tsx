import Link from 'next/link'
import { ReactNode } from 'react'
import { DocsSidebarClient } from './_components/DocsSidebarClient'
import { PrevNextClient } from './_components/PrevNextClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { template: '%s — Forge AI Docs', default: 'Forge AI Documentation' },
  description:
    'Learn how to build full-stack applications with Forge AI — the AI-powered app builder powered by Claude, GPT-4o, and Gemini.',
}

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Top nav */}
      <header className="sticky top-0 z-30 h-14 border-b border-gray-800 bg-gray-950/90 backdrop-blur-md flex items-center px-4 gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <svg
              className="w-3.5 h-3.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-bold text-sm text-white">Forge AI</span>
        </Link>

        <span className="text-gray-600 text-sm hidden sm:block">/</span>
        <Link href="/docs" className="text-sm text-gray-400 hover:text-white transition-colors hidden sm:block">
          Docs
        </Link>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium text-white transition-colors"
          >
            Open App →
          </Link>
          <a
            href="https://github.com/alokkulkarni/startup"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="GitHub"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
        </div>
      </header>

      {/* Body: sidebar + main */}
      <div className="flex flex-1 overflow-hidden">
        <DocsSidebarClient />
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-10 pb-20">
            {children}
            <PrevNextClient />
          </div>
        </main>
      </div>
    </div>
  )
}
