'use client'

interface UpgradePromptProps {
  type: 'rate_limit' | 'project_limit'
  onClose: () => void
  onUpgrade: (priceId: string) => void
}

const MESSAGES: Record<UpgradePromptProps['type'], string> = {
  rate_limit:
    "You've used all 20 AI requests for today. Upgrade to Pro for 300/day.",
  project_limit:
    "You've reached the 3-project limit on the Free plan. Upgrade to create more.",
}

export function UpgradePrompt({ type, onClose, onUpgrade }: UpgradePromptProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-700">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Upgrade Required</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors ml-4 text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="text-gray-300 text-sm mb-6">{MESSAGES[type]}</p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => onUpgrade('price_pro_monthly')}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors"
          >
            Upgrade to Pro — $19/mo
          </button>
          <a
            href="/pricing"
            className="block text-center text-sm text-gray-400 hover:text-white transition-colors py-2"
          >
            View all plans
          </a>
        </div>
      </div>
    </div>
  )
}
