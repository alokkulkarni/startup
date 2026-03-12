'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGitHub } from '@/hooks/useGitHub'
import { RepoBrowserModal } from './RepoBrowserModal'

interface ImportFromGitHubModalProps {
  isOpen: boolean
  onClose: () => void
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

export function ImportFromGitHubModal({ isOpen, onClose }: ImportFromGitHubModalProps) {
  const router = useRouter()
  const { connection, loading, error, connect, importRepo } = useGitHub()

  const [repoBrowserOpen, setRepoBrowserOpen] = useState(false)
  const [selectedOwner, setSelectedOwner] = useState('')
  const [selectedRepo, setSelectedRepo] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('')
  const [projectName, setProjectName] = useState('')
  const [importing, setImporting] = useState(false)

  const handleRepoSelect = (owner: string, repo: string, branch: string) => {
    setSelectedOwner(owner)
    setSelectedRepo(repo)
    setSelectedBranch(branch)
    if (!projectName) setProjectName(repo)
  }

  const handleImport = async () => {
    if (!selectedOwner || !selectedRepo || !selectedBranch) return
    setImporting(true)
    try {
      const result = await importRepo(selectedOwner, selectedRepo, selectedBranch, projectName || undefined)
      onClose()
      router.push(`/dashboard/projects/${result.projectId}`)
    } catch {
      // error from hook
    } finally {
      setImporting(false)
    }
  }

  const handleClose = () => {
    setSelectedOwner('')
    setSelectedRepo('')
    setSelectedBranch('')
    setProjectName('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2 text-white">
            <GitHubIcon />
            <h2 className="text-sm font-semibold">Import from GitHub</h2>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800">
            ✕
          </button>
        </div>

        <div className="p-5">
          {!connection ? (
            <div className="text-center space-y-4 py-4">
              <p className="text-sm text-gray-400">Connect your GitHub account to import repositories.</p>
              {loading ? (
                <div className="flex items-center justify-center">
                  <span className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <button
                  onClick={connect}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 hover:border-gray-500 rounded-lg text-sm text-gray-300 hover:text-white transition-all mx-auto"
                >
                  <GitHubIcon />
                  Connect GitHub
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Repo selector */}
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

              {/* Project name */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Project name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder="my-project"
                  className="w-full h-9 bg-gray-800 border border-gray-700 rounded-lg px-3 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <button
                onClick={handleImport}
                disabled={importing || !selectedRepo || !selectedOwner}
                className="w-full text-sm px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {importing
                  ? <><span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> Importing…</>
                  : 'Import project'}
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
