'use client'
import { useState, useEffect, useRef } from 'react'
import { ChevronDownIcon, PlusIcon, CheckIcon } from 'lucide-react'

interface Workspace {
  id: string
  name: string
  slug: string
  role: string
}

interface Props {
  currentWorkspaceId: string
  onSwitch: (workspaceId: string) => void
}

export function WorkspaceSwitcher({ currentWorkspaceId, onSwitch }: Props) {
  const [open, setOpen] = useState(false)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [creating, setCreating] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  const current = workspaces.find(w => w.id === currentWorkspaceId)

  useEffect(() => {
    fetch(`${apiBase}/api/v1/workspaces`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        // API returns { success: true, data: [...] }
        setWorkspaces(d.data ?? [])
        // Auto-select first workspace if none is active
        if (!currentWorkspaceId && d.data?.length > 0) {
          onSwitch(d.data[0].id)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [apiBase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!createName.trim()) return
    setCreating(true)
    const slug = createName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
    try {
      const res = await fetch(`${apiBase}/api/v1/workspaces`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createName.trim(), slug }),
      })
      if (res.ok) {
        const data = await res.json()
        // API returns { success: true, data: {...workspace, role} }
        if (data.success && data.data) {
          setWorkspaces(prev => [...prev, data.data])
          onSwitch(data.data.id)
          setShowCreate(false)
          setCreateName('')
          setOpen(false)
        }
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-sm font-medium text-gray-200"
      >
        <span className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
          {current?.name?.charAt(0)?.toUpperCase() ?? 'W'}
        </span>
        <span className="max-w-[140px] truncate">
          {loading ? 'Loading...' : (current?.name ?? 'Select workspace')}
        </span>
        <ChevronDownIcon className="w-4 h-4 text-gray-400" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-gray-900 rounded-xl shadow-lg border border-gray-700 z-50 py-1">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Workspaces
          </div>
          {workspaces.map(ws => (
            <button
              key={ws.id}
              onClick={() => {
                onSwitch(ws.id)
                setOpen(false)
              }}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-800 text-left"
            >
              <span className="w-7 h-7 rounded bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {ws.name.charAt(0).toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">{ws.name}</p>
                <p className="text-xs text-gray-500 capitalize">{ws.role}</p>
              </div>
              {ws.id === currentWorkspaceId && (
                <CheckIcon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              )}
            </button>
          ))}
          <div className="border-t border-gray-700 mt-1 pt-1">
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-800 text-sm text-gray-400"
            >
              <PlusIcon className="w-4 h-4" />
              Create workspace
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6 w-96">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">Create Workspace</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Workspace name
                </label>
                <input
                  autoFocus
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-100 placeholder-gray-500"
                  placeholder="My Company"
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false)
                    setCreateName('')
                  }}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !createName.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
