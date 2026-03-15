'use client'
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'

interface EnvVar {
  id: string
  key: string
}

interface EnvVarsPanelProps {
  projectId: string
  token: string | null
  isOpen: boolean
  onClose: () => void
}

export function EnvVarsPanel({
  projectId,
  token: _token,
  isOpen,
  onClose,
}: EnvVarsPanelProps) {
  const [vars, setVars] = useState<EnvVar[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [showValue, setShowValue] = useState(false)
  const [adding, setAdding] = useState(false)

  const fetchVars = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await api.get<{ vars: EnvVar[] }>(`/v1/projects/${projectId}/env`)
      if (res.data?.vars) setVars(res.data.vars)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (isOpen) fetchVars()
  }, [isOpen, fetchVars])

  const handleAdd = async () => {
    const trimmedKey = newKey.trim()
    if (!trimmedKey || !newValue.trim()) return
    setAdding(true)
    try {
      await api.put(`/v1/projects/${projectId}/env/${trimmedKey}`, { value: newValue })
      setNewKey('')
      setNewValue('')
      await fetchVars()
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (key: string) => {
    await api.delete(`/v1/projects/${projectId}/env/${key}`)
    await fetchVars()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Slide-in panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-96 bg-gray-900 border-l border-gray-700 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-white">Environment Variables</h2>
          <button
            onClick={onClose}
            aria-label="Close env vars"
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800"
          >
            ✕
          </button>
        </div>

        {/* Write-only warning */}
        <div className="shrink-0 px-4 py-3 border-b border-gray-700">
          <div className="bg-amber-950/50 border border-amber-800/50 rounded-lg px-3 py-2">
            <p className="text-xs text-amber-400">
              ⚠ Values are write-only. Once saved, they cannot be viewed.
            </p>
          </div>
        </div>

        {/* Add form */}
        <div className="shrink-0 px-4 py-3 border-b border-gray-700 flex flex-col gap-2">
          <input
            type="text"
            value={newKey}
            onChange={e => setNewKey(e.target.value)}
            placeholder="KEY"
            className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-mono uppercase"
          />
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showValue ? 'text' : 'password'}
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                placeholder="value"
                className="w-full px-3 py-2 pr-12 text-sm bg-gray-800 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
              />
              <button
                type="button"
                onClick={() => setShowValue(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showValue ? 'Hide' : 'Show'}
              </button>
            </div>
            <button
              onClick={handleAdd}
              disabled={adding || !newKey.trim() || !newValue.trim()}
              className="px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adding ? '…' : 'Add'}
            </button>
          </div>
        </div>

        {/* Vars list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col gap-2 p-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : vars.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
              <p className="text-sm text-gray-400">No environment variables.</p>
              <p className="text-xs text-gray-500 mt-1">
                Add key-value pairs to inject into deployments.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col">
              {vars.map(envVar => (
                <li
                  key={envVar.id}
                  className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                >
                  <span className="text-xs font-mono text-gray-300">{envVar.key}</span>
                  <button
                    onClick={() => handleDelete(envVar.key)}
                    aria-label={`Delete ${envVar.key}`}
                    className="text-gray-500 hover:text-red-400 transition-colors p-1 rounded"
                  >
                    🗑
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
