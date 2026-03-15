'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render(el: HTMLElement, params: {
        sitekey: string
        callback: (token: string) => void
        'expired-callback'?: () => void
        'error-callback'?: () => void
        theme?: 'light' | 'dark' | 'auto'
      }): string
      remove(id: string): void
      reset(id: string): void
    }
    _turnstileLoaded?: boolean
  }
}

interface TurnstileProps {
  siteKey: string
  onSuccess: (token: string) => void
  onExpire?: () => void
}

export function TurnstileWidget({ siteKey, onSuccess, onExpire }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  useEffect(() => {
    function render() {
      if (!containerRef.current || widgetIdRef.current || !window.turnstile) return
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: onSuccess,
        'expired-callback': onExpire,
        theme: 'dark',
      })
    }

    if (window.turnstile) {
      render()
    } else if (!window._turnstileLoaded) {
      window._turnstileLoaded = true
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.defer = true
      script.onload = render
      document.head.appendChild(script)
    } else {
      // Script is loading — poll briefly
      const interval = setInterval(() => {
        if (window.turnstile) { clearInterval(interval); render() }
      }, 100)
      return () => clearInterval(interval)
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [siteKey, onSuccess, onExpire])

  return <div ref={containerRef} className="flex justify-center" />
}
