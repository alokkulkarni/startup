'use client'

interface Props {
  icon: string
  label: string
  value: number | string
  delta?: number
  sublabel?: string
  loading?: boolean
}

export function StatCard({ icon, label, value, delta, sublabel, loading = false }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        {delta !== undefined && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${delta >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {delta >= 0 ? '+' : ''}{delta}%
          </span>
        )}
      </div>
      {loading ? (
        <div className="h-8 w-24 bg-gray-100 rounded animate-pulse" />
      ) : (
        <p className="text-3xl font-bold text-gray-900 tabular-nums">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      )}
      <p className="text-sm text-gray-500">{label}</p>
      {sublabel && <p className="text-xs text-gray-400">{sublabel}</p>}
    </div>
  )
}
