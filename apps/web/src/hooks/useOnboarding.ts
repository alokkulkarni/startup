'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

interface OnboardingState {
  completed: boolean
  step: number
}

export function useOnboarding() {
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchOnboarding = async () => {
    setLoading(true)
    try {
      const res = await api.get<OnboardingState>('/v1/users/me/onboarding')
      setOnboarding(res.data ?? null)
    } catch {
      setOnboarding(null)
    } finally {
      setLoading(false)
    }
  }

  const updateOnboarding = async (data: { completed?: boolean; step?: number }) => {
    setLoading(true)
    try {
      const res = await api.post<OnboardingState>('/v1/users/me/onboarding', data)
      setOnboarding(res.data ?? null)
    } catch {
      // silently ignore update errors
    } finally {
      setLoading(false)
    }
  }

  const completeOnboarding = async () => updateOnboarding({ completed: true })

  useEffect(() => {
    fetchOnboarding()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { onboarding, loading, fetchOnboarding, updateOnboarding, completeOnboarding }
}
