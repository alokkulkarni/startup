'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  toasts: Toast[]
  toast: (message: string, variant?: ToastVariant) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  toast: () => {},
  dismiss: () => {},
})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, variant }])
    setTimeout(() => dismiss(id), 4000)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

const variantStyles: Record<ToastVariant, string> = {
  success: 'bg-green-900/90 border-green-700 text-green-100',
  error:   'bg-red-900/90 border-red-700 text-red-100',
  info:    'bg-gray-800/90 border-gray-600 text-gray-100',
  warning: 'bg-amber-900/90 border-amber-700 text-amber-100',
}

const variantIcons: Record<ToastVariant, string> = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
  warning: '⚠',
}

function ToastContainer() {
  const { toasts, dismiss } = useContext(ToastContext)
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm animate-in slide-in-from-bottom-2 ${variantStyles[t.variant]}`}
        >
          <span className="text-sm font-bold mt-0.5">{variantIcons[t.variant]}</span>
          <p className="flex-1 text-sm">{t.message}</p>
          <button onClick={() => dismiss(t.id)} className="text-current opacity-60 hover:opacity-100 text-xs">✕</button>
        </div>
      ))}
    </div>
  )
}
