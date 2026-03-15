'use client'

interface DataPoint { date: string; count: number }
interface Props { data: DataPoint[]; height?: number; color?: string; label?: string }

export function BarChart({ data, height = 120, color = '#10b981', label }: Props) {
  if (!data.length) return <div className="h-28 flex items-center justify-center text-gray-400 text-sm">No data</div>

  const max = Math.max(...data.map(d => d.count), 1)
  const barW = 100 / data.length

  return (
    <div>
      {label && <p className="text-xs text-gray-500 mb-1">{label}</p>}
      <svg viewBox={`0 0 100 ${height}`} className="w-full" preserveAspectRatio="none">
        {data.map((d, i) => {
          const barH = (d.count / max) * (height - 10)
          return (
            <rect
              key={i}
              x={i * barW + barW * 0.1}
              y={height - barH - 5}
              width={barW * 0.8}
              height={Math.max(barH, 1)}
              fill={color}
              opacity="0.8"
              rx="1"
            />
          )
        })}
      </svg>
      <div className="flex justify-between mt-1">
        {data.filter((_, i) => i % 5 === 0 || i === data.length - 1).map((d, i) => (
          <span key={i} className="text-xs text-gray-400">{d.date.slice(5)}</span>
        ))}
      </div>
    </div>
  )
}
