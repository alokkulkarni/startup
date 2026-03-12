import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'

const mockWorkspaces = [
  { id: 'ws-1', name: 'Acme Corp', slug: 'acme', role: 'owner' },
  { id: 'ws-2', name: 'Side Project', slug: 'side', role: 'editor' },
]

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ workspaces: mockWorkspaces }),
  } as Response)
})

describe('WorkspaceSwitcher', () => {
  it('renders current workspace name after loading', async () => {
    render(<WorkspaceSwitcher currentWorkspaceId="ws-1" onSwitch={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeDefined()
    })
  })

  it('shows loading text initially', () => {
    render(<WorkspaceSwitcher currentWorkspaceId="ws-1" onSwitch={vi.fn()} />)
    expect(screen.getByText('Loading...')).toBeDefined()
  })

  it('opens dropdown on button click', async () => {
    render(<WorkspaceSwitcher currentWorkspaceId="ws-1" onSwitch={vi.fn()} />)
    await waitFor(() => screen.getByText('Acme Corp'))
    const button = screen.getByRole('button', { name: /acme corp/i })
    fireEvent.click(button)
    expect(screen.getByText('Workspaces')).toBeDefined()
  })

  it('shows all workspaces in dropdown', async () => {
    render(<WorkspaceSwitcher currentWorkspaceId="ws-1" onSwitch={vi.fn()} />)
    await waitFor(() => screen.getByText('Acme Corp'))
    fireEvent.click(screen.getByRole('button', { name: /acme corp/i }))
    expect(screen.getAllByText('Acme Corp').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Side Project')).toBeDefined()
  })

  it('calls onSwitch when a workspace is selected', async () => {
    const onSwitch = vi.fn()
    render(<WorkspaceSwitcher currentWorkspaceId="ws-1" onSwitch={onSwitch} />)
    await waitFor(() => screen.getByText('Acme Corp'))
    fireEvent.click(screen.getByRole('button', { name: /acme corp/i }))
    fireEvent.click(screen.getByText('Side Project'))
    expect(onSwitch).toHaveBeenCalledWith('ws-2')
  })

  it('shows create workspace form when button clicked', async () => {
    render(<WorkspaceSwitcher currentWorkspaceId="ws-1" onSwitch={vi.fn()} />)
    await waitFor(() => screen.getByText('Acme Corp'))
    fireEvent.click(screen.getByRole('button', { name: /acme corp/i }))
    fireEvent.click(screen.getByText('Create workspace'))
    expect(screen.getByPlaceholderText('My Company')).toBeDefined()
  })

  it('creates a new workspace and calls onSwitch', async () => {
    const onSwitch = vi.fn()
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ workspaces: mockWorkspaces }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ workspace: { id: 'ws-3', name: 'New WS', slug: 'new-ws' } }),
      } as Response)

    render(<WorkspaceSwitcher currentWorkspaceId="ws-1" onSwitch={onSwitch} />)
    await waitFor(() => screen.getByText('Acme Corp'))
    fireEvent.click(screen.getByRole('button', { name: /acme corp/i }))
    fireEvent.click(screen.getByText('Create workspace'))
    fireEvent.change(screen.getByPlaceholderText('My Company'), { target: { value: 'New WS' } })
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }))
    await waitFor(() => {
      expect(onSwitch).toHaveBeenCalledWith('ws-3')
    })
  })
})
