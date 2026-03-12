'use client'

interface PlanBadgeProps {
  tier: 'free' | 'pro' | 'team'
  size?: 'sm' | 'md'
}

const PLAN_CONFIG = {
  free: { bg: 'bg-gray-700', text: 'text-gray-300', label: 'Free', icon: null },
  pro: { bg: 'bg-violet-600', text: 'text-white', label: 'Pro', icon: '⚡' },
  team: { bg: 'bg-amber-500', text: 'text-white', label: 'Team', icon: '🚀' },
} as const

export function PlanBadge({ tier, size = 'md' }: PlanBadgeProps) {
  const config = PLAN_CONFIG[tier]
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2.5 py-1'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${config.bg} ${config.text} ${sizeClass}`}
    >
      {config.icon && <span>{config.icon}</span>}
      <span>{config.label}</span>
    </span>
  )
}
