'use client'
import { useGitHub } from '@/hooks/useGitHub'

interface ConnectGitHubButtonProps {
  onConnect?: () => void
  onDisconnect?: () => void
}

export function ConnectGitHubButton({ onConnect, onDisconnect }: ConnectGitHubButtonProps) {
  const { connection, loading, connect, disconnect } = useGitHub()

  if (loading && !connection) {
    return (
      <button
        disabled
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 opacity-75"
      >
        <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
        Loading…
      </button>
    )
  }

  if (connection) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-300">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          {connection.githubLogin}
        </div>
        <button
          onClick={async () => { await disconnect(); onDisconnect?.() }}
          className="text-xs text-gray-500 hover:text-red-400 transition-colors"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => { onConnect?.(); connect() }}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gray-800 border border-gray-700 hover:border-gray-500 rounded-lg text-gray-300 hover:text-white transition-all"
    >
      <GitHubIcon />
      Connect GitHub
    </button>
  )
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}
