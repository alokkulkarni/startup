'use client'
import { useState } from 'react'

const ROLES = ['editor', 'viewer'] as const

interface Props {
  onInvite: (email: string, role: string) => Promise<void>
}

export function InviteForm({ onInvite }: Props) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<string>('editor')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    setErrorMsg('')
    try {
      await onInvite(email.trim(), role)
      setStatus('success')
      setEmail('')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to send invitation')
      setStatus('error')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor="invite-email" className="block text-sm font-medium text-gray-300 mb-1">
          Email address
        </label>
        <input
          id="invite-email"
          type="email"
          required
          placeholder="colleague@company.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={status === 'loading'}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        />
      </div>
      <div>
        <label htmlFor="invite-role" className="block text-sm font-medium text-gray-300 mb-1">
          Role
        </label>
        <select
          id="invite-role"
          value={role}
          onChange={e => setRole(e.target.value)}
          disabled={status === 'loading'}
          className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {ROLES.map(r => (
            <option key={r} value={r}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={status === 'loading' || !email.trim()}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap"
      >
        {status === 'loading' ? 'Sending...' : 'Send invite'}
      </button>
      {status === 'success' && (
        <p className="text-xs text-green-400 sm:self-end sm:pb-2">Invitation sent!</p>
      )}
      {status === 'error' && (
        <p className="text-xs text-red-400 sm:self-end sm:pb-2">{errorMsg}</p>
      )}
    </form>
  )
}
