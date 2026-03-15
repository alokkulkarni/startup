'use client'

import type { UsageInfo } from '@/hooks/useSubscription'

interface UsageBarProps {
  usage: UsageInfo
  onUpgrade?: () => void
}

export function UsageBar({ usage, onUpgrade }: UsageBarProps) {
  const pct = usage.limit > 0 ? Math.min((usage.used / usage.limit) * 100, 100) : 0
  const isNearLimit = pct >= 90
  const isAtLimit = pct >= 100

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-300">AI Requests Today</span>
        <span className={`text-sm font-medium ${isNearLimit ? 'text-red-400' : 'text-gray-300'}`}>
          {usage.used} / {usage.limit}
        </span>
      </div>

      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isNearLimit ? 'bg-red-500' : 'bg-violet-500'}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {isAtLimit ? (
        <div className="flex items-center justify-between">
          <span className="text-xs text-red-400">Limit reached — upgrade for more</span>
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="text-xs text-violet-400 hover:text-violet-300 underline transition-colors"
            >
              Upgrade
            </button>
          )}
        </div>
      ) : isNearLimit ? (
        <p className="text-xs text-orange-400">⚠️ Nearing limit</p>
      ) : null}

      <p className="text-xs text-gray-500">Resets at midnight UTC</p>
    </div>
  )
}
