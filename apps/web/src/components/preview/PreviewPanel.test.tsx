import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PreviewPanel } from './PreviewPanel'
import type { WCStatus, LogEntry, WCError } from '@/hooks/useWebContainer'
import type { Viewport } from './ViewportToggle'

// PreviewPanel receives all data as props — no hook to mock
const baseProps = {
  status: 'idle' as WCStatus,
  previewUrl: null,
  progress: 0,
  logs: [] as LogEntry[],
  error: null as WCError | null,
  viewport: 'desktop' as Viewport,
  onViewportChange: vi.fn(),
  onRefresh: vi.fn(),
  onStop: vi.fn(),
  onFixWithAI: vi.fn(),
  onClearLogs: vi.fn(),
  showConsole: false,
  onToggleConsole: vi.fn(),
}

describe('PreviewPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state when status is booting', () => {
    render(<PreviewPanel {...baseProps} status="booting" progress={30} />)
    expect(screen.getByText('Booting…')).toBeInTheDocument()
    // Spinner should be present
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).not.toBeNull()
  })

  it('renders preview URL in iframe when ready', () => {
    render(
      <PreviewPanel
        {...baseProps}
        status="ready"
        previewUrl="http://localhost:3000"
        progress={100}
      />,
    )
    const iframe = document.querySelector('iframe')
    expect(iframe).not.toBeNull()
    expect(iframe?.getAttribute('src')).toBe('http://localhost:3000')
  })

  it('calls onFixWithAI when error overlay Fix with AI button is clicked', () => {
    const onFixWithAI = vi.fn()
    const error: WCError = {
      kind: 'app',
      message: 'SyntaxError: unexpected token',
      stack: 'SyntaxError: unexpected token\n  at eval:1:1',
    }
    render(<PreviewPanel {...baseProps} error={error} onFixWithAI={onFixWithAI} />)

    const fixBtn = screen.getByText('Fix with AI')
    expect(fixBtn).toBeInTheDocument()
    fireEvent.click(fixBtn)

    expect(onFixWithAI).toHaveBeenCalledOnce()
    expect(onFixWithAI).toHaveBeenCalledWith(
      expect.stringContaining('SyntaxError: unexpected token'),
    )
  })
})
