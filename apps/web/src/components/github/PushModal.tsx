'use client'
import { useState } from 'react'
import { useGitHub } from '@/hooks/useGitHub'
import { RepoBrowserModal } from './RepoBrowserModal'

interface PushModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
}

export function PushModal({ isOpen, onClose, projectId }: PushModalProps) {
  const { pushToNewRepo, pushToExistingRepo, loading, error } = useGitHub(projectId)
  const [activeTab, setActiveTab] = useState<'new' | 'existing'>('new')

  // New repo tab state
  const [repoName, setRepoName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [description, setDescription] = useState('')

  // Existing repo tab state
  const [repoBrowserOpen, setRepoBrowserOpen] = useState(false)
  const [selectedOwner, setSelectedOwner] = useState('')
  const [selectedRepo, setSelectedRepo] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('')
  const [commitMessage, setCommitMessage] = useState('')

  const [success, setSuccess] = useState(false)

  const handlePushNew = async () => {
    if (!repoName.trim()) return
    try {
      await pushToNewRepo(repoName.trim(), { private: isPrivate, description: description || undefined })
      setSuccess(true)
      setTimeout(() => { setSuccess(false); onClose() }, 1500)
    } catch {
      // error displayed via hook state
    }
  }

  const handlePushExisting = async () => {
    if (!selectedOwner || !selectedRepo || !selectedBranch) return
    try {
      await pushToExistingRepo(selectedOwner, selectedRepo, selectedBranch, commitMessage || undefined)
      setSuccess(true)
      setTimeout(() => { setSuccess(false); onClose() }, 1500)
    } catch {
      // error displayed via hook state
    }
  }

  const handleRepoSelect = (owner: string, repo: string, branch: string) => {
    setSelectedOwner(owner)
    setSelectedRepo(repo)
    setSelectedBranch(branch)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-white">Push to GitHub</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {(['new', 'existing'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-white border-b-2 border-indigo-500'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab === 'new' ? 'New Repository' : 'Existing Repository'}
            </button>
          ))}
        </div>

        <div className="p-5">
          {success ? (
            <div className="flex items-center gap-2 py-4 text-green-400 text-sm justify-center">
              <span>✓</span> Pushed successfully!
            </div>
          ) : activeTab === 'new' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Repository name</label>
                <input
                  type="text"
                  value={repoName}
                  onChange={e => setRepoName(e.target.value)}
                  placeholder="my-project"
                  className="w-full h-9 bg-gray-800 border border-gray-700 rounded-lg px-3 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Description (optional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What does this project do?"
                  className="w-full h-9 bg-gray-800 border border-gray-700 rounded-lg px-3 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => setIsPrivate(v => !v)}
                  className={`w-9 h-5 rounded-full transition-colors relative ${isPrivate ? 'bg-indigo-600' : 'bg-gray-700'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isPrivate ? 'translate-x-4' : ''}`} />
                </div>
                <span className="text-sm text-gray-300">Private repository</span>
              </label>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                onClick={handlePushNew}
                disabled={loading || !repoName.trim()}
                className="w-full text-sm px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {loading ? <><span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> Pushing…</> : 'Push to new repo'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Repository</label>
                {selectedRepo ? (
                  <div className="flex items-center justify-between h-9 bg-gray-800 border border-gray-700 rounded-lg px-3">
                    <span className="text-sm text-gray-300">{selectedOwner}/{selectedRepo} ({selectedBranch})</span>
                    <button onClick={() => setRepoBrowserOpen(true)} className="text-xs text-indigo-400 hover:text-indigo-300">
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setRepoBrowserOpen(true)}
                    className="w-full h-9 bg-gray-800 border border-gray-700 border-dashed hover:border-gray-500 rounded-lg px-3 text-sm text-gray-500 hover:text-gray-300 transition-colors text-left"
                  >
                    + Select repository…
                  </button>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Commit message (optional)</label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={e => setCommitMessage(e.target.value)}
                  placeholder="Update project files"
                  className="w-full h-9 bg-gray-800 border border-gray-700 rounded-lg px-3 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                onClick={handlePushExisting}
                disabled={loading || !selectedRepo}
                className="w-full text-sm px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {loading ? <><span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> Pushing…</> : 'Push to repo'}
              </button>
            </div>
          )}
        </div>
      </div>

      <RepoBrowserModal
        isOpen={repoBrowserOpen}
        onClose={() => setRepoBrowserOpen(false)}
        onSelect={handleRepoSelect}
      />
    </div>
  )
}
