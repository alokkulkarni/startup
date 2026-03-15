'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SocialButton } from '@/components/auth/SocialButton'
import { TurnstileWidget } from '@/components/auth/TurnstileWidget'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api'
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '1x00000000000000000000AA'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const captchaReady = !!captchaToken

  const handleCaptchaSuccess = useCallback((token: string) => {
    setCaptchaToken(token)
  }, [])

  const handleCaptchaExpire = useCallback(() => {
    setCaptchaToken(null)
  }, [])

  const handleOAuthSignup = (provider: 'github' | 'google') => {
    if (!captchaToken) return
    setLoading(provider)
    const url = `${API}/v1/auth/${provider}/authorize?next=${encodeURIComponent('/dashboard')}&captchaToken=${encodeURIComponent(captchaToken)}`
    window.location.href = url
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!captchaToken) {
      setError('Please complete the captcha verification.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading('email')
    try {
      const res = await fetch(`${API}/v1/auth/email/signup`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || email.split('@')[0], email, password, captchaToken }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err?.error?.message ?? 'Sign up failed. Please try again.')
        setLoading(null)
        setCaptchaToken(null)
        return
      }

      const data = await res.json()
      if (data?.data?.requiresVerification) {
        window.location.href = '/verify-email'
      } else {
        window.location.href = '/dashboard'
      }
    } catch {
      setError('Sign up failed. Please check your connection.')
      setLoading(null)
      setCaptchaToken(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-forge-950 via-gray-950 to-gray-900 border-r border-gray-800">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-forge-500 rounded-xl flex items-center justify-center font-bold text-white text-xl">
            F
          </div>
          <span className="text-xl font-semibold">Forge AI</span>
        </Link>

        <div className="space-y-6">
          <blockquote className="text-2xl font-medium text-gray-100 leading-relaxed">
            "I shipped a full-stack MVP in an afternoon. This is the future of building software."
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-forge-700 flex items-center justify-center text-sm font-bold">AK</div>
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

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12">
        <div className="w-full max-w-sm space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-forge-500 rounded-lg flex items-center justify-center font-bold text-white">F</div>
            <span className="text-lg font-semibold">Forge AI</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white">Create your account</h1>
            <p className="text-sm text-gray-400 mt-1">
              Already have an account?{' '}
              <Link href="/login" className="text-forge-400 hover:text-forge-300 font-medium">
                Sign in
              </Link>
            </p>
          </div>

          {/* OAuth signup buttons */}
          <div className="space-y-3">
            <SocialButton
              provider="github"
              onClick={() => handleOAuthSignup('github')}
              loading={loading === 'github'}
              className={!captchaReady ? 'opacity-50 pointer-events-none' : ''}
            />
            <SocialButton
              provider="google"
              onClick={() => handleOAuthSignup('google')}
              loading={loading === 'google'}
              className={!captchaReady ? 'opacity-50 pointer-events-none' : ''}
            />
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-950 px-2 text-gray-500">or sign up with email</span>
            </div>
          </div>

          {/* Email form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Full name</label>
              <Input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-600 focus:border-forge-500"
                autoComplete="name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email address</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-600 focus:border-forge-500"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-600 focus:border-forge-500 pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm password</label>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                className="bg-gray-900 border-gray-800 text-white placeholder:text-gray-600 focus:border-forge-500"
                autoComplete="new-password"
              />
            </div>

            {/* Captcha */}
            <div className="pt-1">
              <TurnstileWidget
                siteKey={SITE_KEY}
                onSuccess={handleCaptchaSuccess}
                onExpire={handleCaptchaExpire}
              />
              {!captchaReady && (
                <p className="text-xs text-center text-gray-500 mt-2">
                  Complete the verification above to continue
                </p>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-800/40 rounded-lg text-sm text-red-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={!captchaReady || loading !== null}
              className="w-full bg-forge-600 hover:bg-forge-500 text-white font-medium py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'email' ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account…</>
              ) : 'Create account'}
            </Button>
          </form>

          <p className="text-xs text-gray-500 text-center">
            By creating an account you agree to our{' '}
            <Link href="/terms" className="underline hover:text-gray-300">Terms</Link>
            {' '}and{' '}
            <Link href="/privacy" className="underline hover:text-gray-300">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
