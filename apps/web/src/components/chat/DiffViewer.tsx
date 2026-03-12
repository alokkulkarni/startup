'use client'

import { cn } from '@/lib/utils'

interface DiffViewerProps {
  diff: string
  filePath: string
}

export function DiffViewer({ diff, filePath }: DiffViewerProps) {
  const lines = diff.split('\n')

  function getLineStyle(line: string): string {
    if (line.startsWith('+')) return 'bg-green-950 text-green-300'
    if (line.startsWith('-')) return 'bg-red-950 text-red-300'
    if (line.startsWith('@@')) return 'bg-indigo-950 text-indigo-300'
    return 'text-gray-300'
  }

  return (
    <div className="rounded-lg overflow-hidden border border-gray-700 my-2">
      {/* File path header */}
      <div className="bg-gray-800 px-3 py-2 flex items-center gap-2 border-b border-gray-700">
        <svg
          className="w-4 h-4 text-gray-400 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
        <span className="text-xs font-mono text-gray-300 truncate">{filePath}</span>
      </div>

      {/* Diff lines */}
      <div className="overflow-x-auto bg-gray-950">
        <pre className="text-sm font-mono leading-relaxed">
          {lines.map((line, index) => (
            <div
              key={index}
              className={cn('px-3 py-0.5 whitespace-pre', getLineStyle(line))}
            >
              {line || ' '}
            </div>
          ))}
        </pre>
      </div>
    </div>
  )
}
