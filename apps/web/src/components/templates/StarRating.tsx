'use client'

interface StarRatingProps {
  value: number
  onChange?: (n: number) => void
  readonly?: boolean
}

export function StarRating({ value, onChange, readonly = false }: StarRatingProps) {
  return (
    <div className="flex gap-1" role="group" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange?.(n)}
          className={[
            'text-xl transition-colors focus:outline-none',
            readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110',
            n <= Math.round(value) ? 'text-yellow-400' : 'text-gray-600',
          ].join(' ')}
          aria-label={`Rate ${n} star${n !== 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}
