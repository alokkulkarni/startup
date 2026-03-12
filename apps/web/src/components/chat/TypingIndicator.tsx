'use client'

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <span className="text-sm text-gray-400 mr-2">Forge AI is thinking</span>
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
