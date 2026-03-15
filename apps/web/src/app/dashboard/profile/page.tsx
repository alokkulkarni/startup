'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { initAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

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
  pro: 'bg-forge-900 text-forge-300 border border-forge-700',
  team: 'bg-purple-900/50 text-purple-300 border border-purple-700',
  enterprise: 'bg-amber-900/50 text-amber-300 border border-amber-700',
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [name, setName] = useState('')
  const [saveMsg, setSaveMsg] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    initAuth().then(({ authenticated }) => {
      if (!authenticated) { window.location.href = '/login'; return }
      api.get<UserProfile>('/v1/users/me').then(res => {
        if (res.data) {
          setUser(res.data)
          setName(res.data.name)
        }
        setLoading(false)
      }).catch(() => setLoading(false))
    })
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
    await api.delete('/v1/users/me')
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-forge-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-forge-500 rounded-lg flex items-center justify-center font-bold text-white text-sm">F</div>
          <span className="font-semibold">Forge AI</span>
        </Link>
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">
          ← Dashboard
        </Link>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12 space-y-10">
        <div>
          <h1 className="text-2xl font-bold">Account settings</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your profile and account preferences</p>
        </div>

        {/* Avatar + info */}
        <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 space-y-6">
          <h2 className="text-base font-semibold">Profile</h2>

          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-forge-800 flex items-center justify-center text-2xl font-bold text-forge-200 overflow-hidden">
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
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-forge-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-forge-600 transition-colors disabled:opacity-50"
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

        {/* Plan */}
        <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 space-y-4">
          <h2 className="text-base font-semibold">Subscription</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium capitalize">{user?.plan} plan</p>
              <p className="text-sm text-gray-400">
                {user?.plan === 'free' ? '50 AI messages/day · 3 projects' : 'Unlimited access'}
              </p>
            </div>
            <Button variant="secondary">Upgrade plan</Button>
          </div>
        </section>

        {/* Danger zone */}
        <section className="rounded-xl border border-red-900/50 bg-red-950/20 p-6 space-y-4">
          <h2 className="text-base font-semibold text-red-400">Danger zone</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete account</p>
              <p className="text-sm text-gray-400">Your data will be permanently deleted in 30 days</p>
            </div>
            <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
              Delete account
            </Button>
          </div>
        </section>
      </main>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md w-full mx-4 space-y-4">
            <h3 className="text-xl font-bold">Delete your account?</h3>
            <p className="text-gray-400 text-sm">
              This will immediately deactivate your account. Your data will be permanently deleted in 30 days. This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <Button variant="danger" onClick={handleDeleteAccount} className="flex-1">
                Yes, delete my account
              </Button>
              <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
