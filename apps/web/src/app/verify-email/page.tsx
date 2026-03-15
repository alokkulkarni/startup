'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api'
const OTP_LENGTH = 6

export default function VerifyEmailPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sending, setSending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [error, setError] = useState('')
  const [verified, setVerified] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const sentRef = useRef(false)

  // Send OTP on first mount
  useEffect(() => {
    if (authLoading || !user) return
    if ((user as any).emailVerified) { router.replace('/dashboard'); return }
    if (sentRef.current) return
    sentRef.current = true
    void sendOtp()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user])

  const startCooldown = useCallback((seconds = 60) => {
    setCooldown(seconds)
    const id = setInterval(() => {
      setCooldown(c => {
        if (c <= 1) { clearInterval(id); return 0 }
        return c - 1
      })
    }, 1000)
  }, [])

  const sendOtp = useCallback(async () => {
    setSending(true)
    setError('')
    try {
      await fetch(`${API}/v1/auth/otp/send`, { method: 'POST', credentials: 'include' })
      startCooldown(60)
    } catch {
      setError('Failed to send verification code. Please try again.')
    } finally {
      setSending(false)
    }
  }, [startCooldown])

  const handleResend = () => {
    if (cooldown > 0) return
    void sendOtp()
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH)
    setCode(val)
    setError('')
    if (val.length === OTP_LENGTH) {
      void verify(val)
    }
  }

  const verify = useCallback(async (otpCode: string) => {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`${API}/v1/auth/otp/verify`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otpCode }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err?.error?.message ?? 'Invalid code. Please try again.')
        setCode('')
        setTimeout(() => inputRef.current?.focus(), 50)
        return
      }

      setVerified(true)
      setTimeout(() => router.replace('/dashboard'), 1500)
    } catch {
      setError('Verification failed. Please try again.')
      setCode('')
    } finally {
      setSubmitting(false)
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== OTP_LENGTH) return
    await verify(code)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-forge-400 animate-spin" />
      </div>
    )
  }

  if (verified) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">Email verified!</h1>
          <p className="text-gray-400">Taking you to your dashboard…</p>
        </div>
      </div>
    )
  }

  const maskedEmail = user?.email
    ? user.email.replace(/^(.{2})(.+)(@.+)$/, (_, a, _b, c) => `${a}${'•'.repeat(4)}${c}`)
    : 'your email'

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-6">

        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-forge-500/10 border border-forge-500/20 mb-2">
          <Mail className="w-8 h-8 text-forge-400" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white">Check your email</h1>
          <p className="text-gray-400 mt-2 text-sm">
            We sent a 6-digit code to <span className="text-gray-200">{maskedEmail}</span>.
            <br />Enter it below to verify your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={OTP_LENGTH}
              value={code}
              onChange={handleCodeChange}
              placeholder="000000"
              disabled={submitting}
              className="w-full text-center text-3xl font-mono tracking-[0.5em] bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-4 focus:outline-none focus:border-forge-500 transition-colors placeholder:text-gray-700 disabled:opacity-50"
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-800/40 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={code.length !== OTP_LENGTH || submitting}
            className="w-full bg-forge-600 hover:bg-forge-500 text-white font-medium py-2.5 disabled:opacity-50"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying…</>
            ) : 'Verify email'}
          </Button>
        </form>

        <div className="pt-2">
          <button
            onClick={handleResend}
            disabled={cooldown > 0 || sending}
            className="text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            {sending ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> Sending…</>
            ) : cooldown > 0 ? (
              `Resend code in ${cooldown}s`
            ) : (
              <><RefreshCw className="w-3 h-3" /> Resend code</>
            )}
          </button>
        </div>

        <p className="text-xs text-gray-600">
          Wrong email?{' '}
          <a
            href="/logout"
            onClick={async (e) => {
              e.preventDefault()
              await fetch(`${API}/v1/auth/logout`, { method: 'POST', credentials: 'include' })
              window.location.href = '/signup'
            }}
            className="text-gray-500 hover:text-gray-300 underline"
          >
            Start over
          </a>
        </p>
      </div>
    </div>
  )
}
