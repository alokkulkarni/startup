'use client'

interface PullModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function PullModal({ isOpen, onClose, onConfirm }: PullModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-sm mx-4 shadow-2xl">
        <div className="px-5 py-4 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-white">Pull from GitHub</h2>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-gray-300">
            Pull latest changes from GitHub? This will update your project files and create a snapshot.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={async () => { await onConfirm(); onClose() }}
            className="text-sm px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-all"
          >
            Pull
          </button>
        </div>
      </div>
    </div>
  )
}
