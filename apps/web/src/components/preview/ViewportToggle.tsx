'use client'

export type Viewport = 'desktop' | 'tablet' | 'mobile'

export const VIEWPORT_WIDTHS: Record<Viewport, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 375,
}

interface ViewportToggleProps {
  current: Viewport
  onChange: (v: Viewport) => void
}

const VIEWPORTS: Array<{ key: Viewport; label: string; icon: string }> = [
  { key: 'desktop', label: 'Desktop (1280px)', icon: '▭' },
  { key: 'tablet', label: 'Tablet (768px)', icon: '▯' },
  { key: 'mobile', label: 'Mobile (375px)', icon: '▮' },
]

export function ViewportToggle({ current, onChange }: ViewportToggleProps) {
  return (
    <div className="flex items-center rounded-lg border border-gray-700 overflow-hidden">
      {VIEWPORTS.map(({ key, label, icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          title={label}
          aria-label={label}
          aria-pressed={current === key}
          className={`px-2.5 py-1.5 text-sm transition-colors duration-150 leading-none ${
            current === key
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
          }`}
        >
          {icon}
        </button>
      ))}
    </div>
  )
}
