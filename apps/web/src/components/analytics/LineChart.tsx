'use client'

interface DataPoint { date: string; requests: number }
interface Props { data: DataPoint[]; height?: number; color?: string; label?: string }

export function LineChart({ data, height = 160, color = '#6366f1', label = 'Requests' }: Props) {
  if (!data.length) return <div className="h-40 flex items-center justify-center text-gray-400 text-sm">No data</div>

  const max = Math.max(...data.map(d => d.requests), 1)
  const width = 100
  const padY = 10
  const chartH = height - padY * 2

  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * width,
    y: padY + chartH - (d.requests / max) * chartH,
    ...d,
  }))

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padY + chartH} L 0 ${padY + chartH} Z`

  const labels = points.filter((_, i) => i % 5 === 0 || i === points.length - 1)

  return (
    <div>
      {label && <p className="text-xs text-gray-500 mb-1">{label}</p>}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#lineGrad)" />
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.5" fill={color} />
        ))}
      </svg>
      <div className="flex justify-between mt-1">
        {labels.map((p, i) => (
          <span key={i} className="text-xs text-gray-400">{p.date.slice(5)}</span>
        ))}
      </div>
    </div>
  )
}
