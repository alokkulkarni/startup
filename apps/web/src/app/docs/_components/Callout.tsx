import { ReactNode } from 'react'

type CalloutType = 'info' | 'tip' | 'warning' | 'danger'

const styles: Record<CalloutType, { border: string; bg: string; icon: string; titleColor: string }> = {
  info:    { border: 'border-blue-500/50',   bg: 'bg-blue-500/5',   icon: 'ℹ️', titleColor: 'text-blue-300'   },
  tip:     { border: 'border-green-500/50',  bg: 'bg-green-500/5',  icon: '💡', titleColor: 'text-green-300'  },
  warning: { border: 'border-amber-500/50',  bg: 'bg-amber-500/5',  icon: '⚠️', titleColor: 'text-amber-300'  },
  danger:  { border: 'border-red-500/50',    bg: 'bg-red-500/5',    icon: '🚫', titleColor: 'text-red-300'    },
}

export function Callout({
  type = 'info',
  title,
  children,
}: {
  type?: CalloutType
  title?: string
  children: ReactNode
}) {
  const s = styles[type]
  return (
    <div className={`my-6 rounded-lg border-l-4 border ${s.border} ${s.bg} px-5 py-4`}>
      <div className={`flex items-center gap-2 font-semibold text-sm mb-1 ${s.titleColor}`}>
        <span>{s.icon}</span>
        <span>{title ?? type.charAt(0).toUpperCase() + type.slice(1)}</span>
      </div>
      <div className="text-sm text-gray-300 [&_a]:text-indigo-400 [&_a]:underline [&_code]:bg-gray-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs">
        {children}
      </div>
    </div>
  )
}
