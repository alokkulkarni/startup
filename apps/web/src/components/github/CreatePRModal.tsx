'use client'
import { useState } from 'react'
import { useGitHub } from '@/hooks/useGitHub'

interface CreatePRModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  defaultBranch?: string
}

export function CreatePRModal({ isOpen, onClose, projectId, defaultBranch = 'main' }: CreatePRModalProps) {
  const { createPR, loading, error } = useGitHub(projectId)
  const [head, setHead] = useState('')
  const [base, setBase] = useState(defaultBranch)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [prResult, setPrResult] = useState<{ url: string; number: number } | null>(null)

  const handleCreate = async () => {
    if (!head.trim() || !base.trim()) return
    try {
      const result = await createPR(head.trim(), base.trim(), title || undefined, body || undefined)
      setPrResult(result)
    } catch {
      // error displayed via hook state
    }
  }

  const handleClose = () => {
    setPrResult(null)
    setHead('')
    setBase(defaultBranch)
    setTitle('')
    setBody('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-white">Create Pull Request</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800">
            ✕
          </button>
        </div>

        <div className="p-5">
          {prResult ? (
            <div className="space-y-3 text-center py-2">
              <div className="text-green-400 text-sm">✓ Pull request #{prResult.number} created!</div>
              <a
                href={prResult.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                View PR ↗
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Branch inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">From branch (head)</label>
                  <input
                    type="text"
                    value={head}
                    onChange={e => setHead(e.target.value)}
                    placeholder="feature/my-branch"
                    className="w-full h-9 bg-gray-800 border border-gray-700 rounded-lg px-3 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Into branch (base)</label>
                  <input
                    type="text"
                    value={base}
                    onChange={e => setBase(e.target.value)}
                    placeholder="main"
                    className="w-full h-9 bg-gray-800 border border-gray-700 rounded-lg px-3 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="AI-suggested title (auto-generated if blank)"
                  className="w-full h-9 bg-gray-800 border border-gray-700 rounded-lg px-3 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Description</label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Describe the changes in this PR…"
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <button
                onClick={handleCreate}
                disabled={loading || !head.trim() || !base.trim()}
                className="w-full text-sm px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {loading
                  ? <><span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> Creating…</>
                  : 'Create PR'}
              </button>
            </div>
          )}
        </div>

        {prResult && (
          <div className="flex justify-end px-5 py-4 border-t border-gray-700">
            <button
              onClick={handleClose}
              className="text-sm px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
