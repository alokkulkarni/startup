'use client'

const CATEGORIES = [
  { value: '',          label: 'All' },
  { value: 'starter',   label: 'Starter' },
  { value: 'saas',      label: 'SaaS' },
  { value: 'landing',   label: 'Landing' },
  { value: 'blog',      label: 'Blog' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'api',       label: 'API' },
]

interface CategoryFilterProps {
  selected: string
  onChange: (cat: string) => void
}

export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" role="list">
      {CATEGORIES.map(cat => (
        <button
          key={cat.value}
          role="listitem"
          onClick={() => onChange(cat.value)}
          className={[
            'text-sm px-4 py-1.5 rounded-full whitespace-nowrap transition-all font-medium',
            selected === cat.value
              ? 'bg-violet-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white',
          ].join(' ')}
        >
          {cat.label}
        </button>
      ))}
    </div>
  )
}
