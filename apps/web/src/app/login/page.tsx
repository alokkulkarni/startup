'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SocialButton } from '@/components/auth/SocialButton'

type View = 'login' | 'signup' | 'forgot'

export default function LoginPage() {
  const [view, setView] = useState<View>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleSocial = (provider: 'github' | 'google') => {
    setLoading(provider)
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api'}/v1/auth/${provider}/authorize?next=${encodeURIComponent('/dashboard')}`
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading('email')
    setError('')
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api'
      const endpoint = view === 'login' ? '/v1/auth/email/login' : '/v1/auth/email/signup'
      const body: any = { email, password }
      if (view === 'signup') body.name = email.split('@')[0]
      const res = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err?.error?.message ?? 'Sign in failed')
        setLoading(null)
        return
      }
      window.location.href = '/dashboard'
    } catch {
      setError('Sign in failed. Check your credentials.')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-forge-950 via-gray-950 to-gray-900 border-r border-gray-800">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-forge-500 rounded-xl flex items-center justify-center font-bold text-white">
            F
          </div>
          <span className="text-xl font-semibold">Forge AI</span>
        </Link>

        <div className="space-y-6">
          <blockquote className="text-2xl font-medium text-gray-100 leading-relaxed">
            "I shipped a full-stack MVP in an afternoon. This is the future of building software."
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-forge-700 flex items-center justify-center text-sm font-bold">
              AK
            </div>
            <div>
              <p className="text-sm font-medium text-gray-100">Alex Kim</p>
              <p className="text-xs text-gray-500">Founder, Launchpad</p>
            </div>
          </div>
        </div>

        <div className="flex gap-8 text-sm text-gray-500">
          <span>🔒 SOC 2 compliant</span>
          <span>⚡ &lt;100ms latency</span>
          <span>🌍 99.9% uptime</span>
        </div>
      </div>

      {/* Right panel — auth forms */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          {/* Logo (mobile) */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 bg-forge-500 rounded-xl flex items-center justify-center font-bold text-white">F</div>
            <span className="text-xl font-semibold">Forge AI</span>
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-2xl font-bold text-white">
              {view === 'login' && 'Welcome back'}
              {view === 'signup' && 'Create your account'}
              {view === 'forgot' && 'Reset your password'}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {view === 'login' && "Don't have an account? "}
              {view === 'signup' && 'Already have an account? '}
              {view === 'forgot' && 'Remember your password? '}
              {view !== 'forgot' && (
                <button
                  onClick={() => { setView(view === 'login' ? 'signup' : 'login'); setError('') }}
                  className="text-forge-400 hover:text-forge-300 font-medium transition-colors"
                >
                  {view === 'login' ? 'Sign up free' : 'Sign in'}
                </button>
              )}
              {view === 'forgot' && (
                <button onClick={() => { setView('login'); setError('') }} className="text-forge-400 hover:text-forge-300 font-medium">
                  Back to sign in
                </button>
              )}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {view !== 'forgot' && (
            <>
              {/* Social buttons */}
              <div className="space-y-3">
                <SocialButton provider="github" onClick={() => handleSocial('github')} loading={loading === 'github'} />
                <SocialButton provider="google" onClick={() => handleSocial('google')} loading={loading === 'google'} />
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-800" />
                </div>
                <div className="relative flex justify-center text-xs text-gray-500">
                  <span className="bg-gray-950 px-3">or continue with email</span>
                </div>
              </div>

              {/* Email form */}
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <Input
                  id="email"
                  type="email"
                  label="Email address"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
                {view === 'login' && (
                  <>
                    <Input
                      id="password"
                      type="password"
                      label="Password"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setView('forgot')}
                        className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                  </>
                )}
                {view === 'signup' && (
                  <Input
                    id="password"
                    type="password"
                    label="Password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                )}
                <Button type="submit" size="lg" loading={loading === 'email'} className="w-full">
                  {view === 'login' ? 'Sign in' : 'Create account'}
                </Button>
              </form>
            </>
          )}

          {view === 'forgot' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Password reset is not yet available. Please sign in with GitHub or Google, or contact support.
              </p>
              <Button
                type="button"
                size="lg"
                className="w-full"
                onClick={() => setView('login')}
              >
                Back to sign in
              </Button>
            </div>
          )}

          <p className="text-center text-xs text-gray-600">
            By continuing, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-gray-400">Terms</Link>
            {' '}and{' '}
            <Link href="/privacy" className="underline hover:text-gray-400">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
