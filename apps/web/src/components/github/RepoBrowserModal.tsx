'use client'
import { useState, useEffect, useCallback } from 'react'
import { useGitHub } from '@/hooks/useGitHub'
import type { GitHubRepo, GitHubBranch } from '@/hooks/useGitHub'

interface RepoBrowserModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (owner: string, repo: string, branch: string) => void
}

export function RepoBrowserModal({ isOpen, onClose, onSelect }: RepoBrowserModalProps) {
  const { fetchRepos, fetchBranches, loading } = useGitHub()
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [search, setSearch] = useState('')
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null)
  const [branches, setBranches] = useState<GitHubBranch[]>([])
  const [selectedBranch, setSelectedBranch] = useState('')
  const [branchLoading, setBranchLoading] = useState(false)

  const loadRepos = useCallback(async () => {
    const result = await fetchRepos(1)
    setRepos(result)
  }, [fetchRepos])

  useEffect(() => {
    if (isOpen) {
      loadRepos()
      setSearch('')
      setSelectedRepo(null)
      setBranches([])
      setSelectedBranch('')
    }
  }, [isOpen, loadRepos])

  const handleSelectRepo = async (repo: GitHubRepo) => {
    setSelectedRepo(repo)
    setSelectedBranch('')
    setBranchLoading(true)
    const [owner] = repo.fullName.split('/')
    const result = await fetchBranches(owner, repo.name)
    setBranches(result)
    const defaultBranch = result.find(b => b.name === repo.defaultBranch) ?? result[0]
    if (defaultBranch) setSelectedBranch(defaultBranch.name)
    setBranchLoading(false)
  }

  const handleSelect = () => {
    if (!selectedRepo || !selectedBranch) return
    const [owner] = selectedRepo.fullName.split('/')
    onSelect(owner, selectedRepo.name, selectedBranch)
    onClose()
  }

  const filtered = repos.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.fullName.toLowerCase().includes(search.toLowerCase()),
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg mx-4 shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 shrink-0">
          <h2 className="text-sm font-semibold text-white">Select Repository</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-800 shrink-0">
          <input
            type="search"
            placeholder="Search repositories…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 bg-gray-800 border border-gray-700 rounded-lg px-3 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Repo list */}
        <div className="flex-1 overflow-y-auto">
          {loading && repos.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <span className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-500">
              {search ? 'No matching repositories' : 'No repositories found'}
            </div>
          ) : (
            <ul className="divide-y divide-gray-800">
              {filtered.map(repo => (
                <li key={repo.id}>
                  <button
                    onClick={() => handleSelectRepo(repo)}
                    className={`w-full text-left px-5 py-3 hover:bg-gray-800/50 transition-colors ${
                      selectedRepo?.id === repo.id ? 'bg-indigo-500/10 border-l-2 border-indigo-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white truncate">{repo.name}</span>
                          {repo.private && (
                            <span className="text-xs px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded border border-gray-600">
                              Private
                            </span>
                          )}
                        </div>
                        {repo.description && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{repo.description}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-600 shrink-0">
                        {formatDate(repo.updatedAt)}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Branch selector */}
        {selectedRepo && (
          <div className="px-5 py-3 border-t border-gray-800 shrink-0 bg-gray-900/50">
            <label className="block text-xs text-gray-400 mb-1.5">Branch</label>
            {branchLoading ? (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                Loading branches…
              </div>
            ) : (
              <select
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
                className="w-full h-9 bg-gray-800 border border-gray-700 rounded-lg px-3 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
              >
                {branches.map(b => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-700 shrink-0">
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedRepo || !selectedBranch}
            className="text-sm px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all"
          >
            Select
          </button>
        </div>
      </div>
    </div>
  )
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 30) return `${diffDays}d ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}
