/**
 * previewManager unit tests
 *
 * Tests focus on the in-process logic (idle timer, subscriber lifecycle, port
 * allocation) using vi.useFakeTimers() so we don't have to wait real minutes.
 * Docker interactions are fully mocked so no daemon is required.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Hoisted mocks (vi.mock is hoisted to top of file by Vitest) ────────────

const { mockContainer, mockDockerInstance } = vi.hoisted(() => {
  const mockContainer = {
    id: 'mock-container-id',
    putArchive:  vi.fn().mockResolvedValue(undefined),
    start:       vi.fn().mockResolvedValue(undefined),
    stop:        vi.fn().mockResolvedValue(undefined),
    remove:      vi.fn().mockResolvedValue(undefined),
    logs:        vi.fn().mockResolvedValue({ on: vi.fn() }),
    modem:       { demuxStream: vi.fn() },
  }

  const mockDockerInstance = {
    listContainers:  vi.fn().mockResolvedValue([]),
    pull:            vi.fn().mockResolvedValue(undefined),
    createContainer: vi.fn().mockResolvedValue(mockContainer),
    getContainer:    vi.fn().mockReturnValue(mockContainer),
  }

  return { mockContainer, mockDockerInstance }
})

vi.mock('dockerode', () => ({
  default: vi.fn().mockImplementation(() => mockDockerInstance),
}))

// ── Mock drizzle db ────────────────────────────────────────────────────────

const mockFiles = [
  { path: 'package.json', content: '{"name":"test","scripts":{"dev":"vite"}}' },
  { path: 'index.html',   content: '<html></html>' },
]

const mockDb = {
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(mockFiles),
    }),
  }),
} as any

// ── Now import the module ──────────────────────────────────────────────────

import * as preview from './previewManager.js'

// ── Test suite ─────────────────────────────────────────────────────────────

describe('previewManager', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockDockerInstance.createContainer.mockResolvedValue(mockContainer)
    mockDockerInstance.listContainers.mockResolvedValue([])
    mockContainer.logs.mockResolvedValue({ on: vi.fn() })
  })

  afterEach(async () => {
    vi.useRealTimers()
  })

  // ── Container isolation ──────────────────────────────────────────────────

  describe('container isolation per project', () => {
    it('allocates distinct ports for different projects', async () => {
      const portA = await preview.start('project-aaa', 'user-001', mockDb)
      const portB = await preview.start('project-bbb', 'user-002', mockDb)

      expect(portA).not.toBe(portB)

      await preview.stop('project-aaa')
      await preview.stop('project-bbb')
    })

    it('uses project-scoped container names', async () => {
      await preview.start('project-ccc', 'user-001', mockDb)

      const createCall = mockDockerInstance.createContainer.mock.calls[0][0]
      expect(createCall.name).toBe('forge-preview-project-ccc')

      await preview.stop('project-ccc')
    })

    it('labels container with both projectId and userId', async () => {
      await preview.start('project-ddd', 'user-xyz', mockDb)

      const createCall = mockDockerInstance.createContainer.mock.calls[0][0]
      expect(createCall.Labels['forge.project']).toBe('project-ddd')
      expect(createCall.Labels['forge.user']).toBe('user-xyz')

      await preview.stop('project-ddd')
    })

    it('stops old container before starting a new one for the same project', async () => {
      await preview.start('project-eee', 'user-001', mockDb)
      await preview.start('project-eee', 'user-001', mockDb) // restart

      // getContainer called for the old container removal on second start
      expect(mockDockerInstance.getContainer).toHaveBeenCalled()

      await preview.stop('project-eee')
    })
  })

  // ── Idle timer lifecycle ─────────────────────────────────────────────────

  describe('idle timer — 10 minute inactivity teardown', () => {
    it('schedules a 10-minute idle cleanup on start', async () => {
      await preview.start('project-idle-1', 'user-001', mockDb)

      const instance = preview.getInstance('project-idle-1')
      expect(instance?.idleTimer).not.toBeNull()

      await preview.stop('project-idle-1')
    })

    it('stops the container after 10 minutes with no activity', async () => {
      await preview.start('project-idle-2', 'user-001', mockDb)

      // Fast-forward 10 minutes
      await vi.runAllTimersAsync()

      const instance = preview.getInstance('project-idle-2')
      expect(instance).toBeUndefined() // container was stopped and removed from map
    })

    it('does NOT fire in under 10 minutes', async () => {
      await preview.start('project-idle-3', 'user-001', mockDb)

      vi.advanceTimersByTime(9 * 60 * 1000) // 9 minutes

      const instance = preview.getInstance('project-idle-3')
      expect(instance).toBeDefined() // still running

      await preview.stop('project-idle-3')
    })
  })

  // ── Subscriber lifecycle cancels / restarts idle timer ──────────────────

  describe('subscriber connect / disconnect manages idle timer', () => {
    it('cancels idle timer when first subscriber connects', async () => {
      await preview.start('project-sub-1', 'user-001', mockDb)

      const cb = vi.fn()
      const unsubscribe = preview.subscribeToLogs('project-sub-1', cb)

      const instance = preview.getInstance('project-sub-1')
      expect(instance?.idleTimer).toBeNull() // cancelled

      // Advance 15 minutes — should NOT tear down while subscribed
      vi.advanceTimersByTime(15 * 60 * 1000)
      expect(preview.getInstance('project-sub-1')).toBeDefined()

      unsubscribe()
      await preview.stop('project-sub-1')
    })

    it('restarts idle timer when last subscriber disconnects', async () => {
      await preview.start('project-sub-2', 'user-001', mockDb)

      const unsubscribe = preview.subscribeToLogs('project-sub-2', vi.fn())
      unsubscribe() // immediately disconnect

      const instance = preview.getInstance('project-sub-2')
      expect(instance?.idleTimer).not.toBeNull() // restarted

      await preview.stop('project-sub-2')
    })

    it('keeps timer cancelled while multiple subscribers are connected', async () => {
      await preview.start('project-sub-3', 'user-001', mockDb)

      const unsub1 = preview.subscribeToLogs('project-sub-3', vi.fn())
      const unsub2 = preview.subscribeToLogs('project-sub-3', vi.fn())

      unsub1() // first tab closes — second still open
      const instance = preview.getInstance('project-sub-3')
      expect(instance?.idleTimer).toBeNull() // still cancelled (sub2 active)

      unsub2() // last tab closes — now timer should restart
      expect(instance?.idleTimer).not.toBeNull()

      await preview.stop('project-sub-3')
    })

    it('tears down 10 minutes after last subscriber disconnects', async () => {
      await preview.start('project-sub-4', 'user-001', mockDb)

      const unsubscribe = preview.subscribeToLogs('project-sub-4', vi.fn())

      // Active for 5 minutes, then browser closed
      vi.advanceTimersByTime(5 * 60 * 1000)
      unsubscribe()

      // 9 minutes after disconnect — still alive
      vi.advanceTimersByTime(9 * 60 * 1000)
      expect(preview.getInstance('project-sub-4')).toBeDefined()

      // 10 minutes after disconnect — torn down
      vi.advanceTimersByTime(1 * 60 * 1000 + 1000)
      await vi.runAllTimersAsync()
      expect(preview.getInstance('project-sub-4')).toBeUndefined()
    })
  })

  // ── syncFiles resets idle timer ──────────────────────────────────────────

  describe('syncFiles resets idle timer', () => {
    it('resets the 10-minute countdown when files are synced', async () => {
      await preview.start('project-sync-1', 'user-001', mockDb)

      // Advance 8 minutes
      vi.advanceTimersByTime(8 * 60 * 1000)
      expect(preview.getInstance('project-sync-1')).toBeDefined()

      // Sync files (AI updated code) — resets idle timer
      await preview.syncFiles('project-sync-1', mockDb)

      // Another 8 minutes — should still be alive (timer was reset)
      vi.advanceTimersByTime(8 * 60 * 1000)
      expect(preview.getInstance('project-sync-1')).toBeDefined()

      // Total 16 min since start but only 8 since last sync — still alive
      vi.advanceTimersByTime(1 * 60 * 1000 + 1000)
      await vi.runAllTimersAsync()
      // Now 9+ min since sync → should be gone
      expect(preview.getInstance('project-sync-1')).toBeUndefined()
    })
  })

  // ── Port recycling ───────────────────────────────────────────────────────

  describe('port recycling', () => {
    it('recycles port after stop so it can be reused', async () => {
      const port1 = await preview.start('project-port-1', 'user-001', mockDb)
      await preview.stop('project-port-1')

      const port2 = await preview.start('project-port-2', 'user-001', mockDb)
      // port1 was freed — port2 should reuse it (first available slot)
      expect(port2).toBe(port1)

      await preview.stop('project-port-2')
    })
  })
})
