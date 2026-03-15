'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useSubscription } from '@/hooks/useSubscription'

interface UserProfile {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  plan: string
  createdAt: string
}

const planBadgeColors: Record<string, string> = {
  free: 'bg-gray-700 text-gray-300',
  pro: 'bg-violet-900/50 text-violet-300 border border-violet-700',
  team: 'bg-purple-900/50 text-purple-300 border border-purple-700',
  enterprise: 'bg-amber-900/50 text-amber-300 border border-amber-700',
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [name, setName] = useState('')
  const [saveMsg, setSaveMsg] = useState('')
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0) // 0=closed, 1=warn, 2=confirm
  const [deleteLoading, setDeleteLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { subscription } = useSubscription()
  const isPaidPlan = subscription?.tier && subscription.tier !== 'free'

  useEffect(() => {
    api.get<UserProfile>('/v1/users/me').then(res => {
      if (res.data) {
        setUser(res.data)
        setName(res.data.name)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveMsg('')
    const res = await api.patch<UserProfile>('/v1/users/me', { name })
    if (res.data) {
      setUser(res.data)
      setSaveMsg('Profile updated!')
      setTimeout(() => setSaveMsg(''), 3000)
    }
    setSaving(false)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/upload/avatar`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.data?.avatarUrl && user) {
        setUser({ ...user, avatarUrl: data.data.avatarUrl })
      }
    } catch {
      console.error('Avatar upload failed')
    }
    setUploading(false)
  }

  const handleDeleteAccount = async () => {
    setDeleteLoading(true)
    await api.delete('/v1/users/me')
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center font-bold text-white text-sm">F</div>
          <span className="font-semibold">Forge AI</span>
        </Link>
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">
          ← Dashboard
        </Link>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your personal details</p>
        </div>

        {/* Avatar + info */}
        <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 space-y-6">
          <h2 className="text-base font-semibold">Profile</h2>

          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-violet-900/60 flex items-center justify-center text-2xl font-bold text-violet-200 overflow-hidden">
                {user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  user?.name?.[0]?.toUpperCase() ?? '?'
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-violet-600 rounded-full flex items-center justify-center text-white text-xs hover:bg-violet-500 transition-colors disabled:opacity-50"
                title="Upload avatar"
              >
                {uploading ? (
                  <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                ) : '✎'}
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} />
            </div>

            <div className="space-y-1">
              <p className="font-medium">{user?.name}</p>
              <p className="text-sm text-gray-400">{user?.email}</p>
              <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', planBadgeColors[user?.plan ?? 'free'])}>
                {user?.plan?.toUpperCase()} plan
              </span>
            </div>
          </div>

          {/* Edit name */}
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              id="name"
              label="Display name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
            />
            <div className="flex items-center gap-3">
              <Button type="submit" loading={saving}>
                Save changes
              </Button>
              {saveMsg && <p className="text-sm text-green-400">{saveMsg}</p>}
            </div>
          </form>
        </section>

        {/* Account & billing quick link */}
        <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/30 px-5 py-4">
          <div>
            <p className="text-sm font-medium">Account &amp; billing</p>
            <p className="text-xs text-gray-400 mt-0.5">View your plan, usage limits, and invoices</p>
          </div>
          <Link
            href="/dashboard/account"
            className="text-sm text-violet-400 hover:text-violet-300 font-medium transition-colors"
          >
            Manage →
          </Link>
        </div>

        {/* Danger zone */}
        <section className="rounded-xl border border-red-900/50 bg-red-950/20 p-6 space-y-4">
          <h2 className="text-base font-semibold text-red-400">Danger zone</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete account</p>
              <p className="text-sm text-gray-400">Your data will be permanently deleted in 30 days</p>
            </div>
            <Button variant="danger" onClick={() => setDeleteStep(isPaidPlan ? 1 : 2)}>
              Delete account
            </Button>
          </div>
        </section>
      </main>

      {/* Step 1: Paid plan warning */}
      {deleteStep === 1 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md w-full mx-4 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-950/60 border border-amber-700/60 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold">Active subscription will be cancelled</h3>
                <p className="text-gray-400 text-sm mt-1">
                  You have an active <span className="capitalize font-semibold text-white">{subscription?.tier}</span> subscription. Deleting your account will{' '}
                  <strong className="text-amber-300">immediately cancel</strong> your subscription — you will not receive a refund for the remaining period.
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="danger" onClick={() => setDeleteStep(2)} className="flex-1">
                I understand, continue
              </Button>
              <Button variant="outline" onClick={() => setDeleteStep(0)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Final confirmation */}
      {deleteStep === 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md w-full mx-4 space-y-4">
            <h3 className="text-xl font-bold">Delete your account?</h3>
            <p className="text-gray-400 text-sm">
              This will <strong className="text-white">immediately deactivate</strong> your account
              {isPaidPlan ? ' and cancel your subscription' : ''}.
              Your data will be permanently deleted in 30 days. <strong className="text-red-400">This action cannot be undone.</strong>
            </p>
            <div className="flex gap-3 pt-2">
              <Button variant="danger" loading={deleteLoading} onClick={handleDeleteAccount} className="flex-1">
                Yes, delete my account
              </Button>
              <Button variant="outline" onClick={() => setDeleteStep(0)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


interface UserProfile {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  plan: string
  createdAt: string
}
