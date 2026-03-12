import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FileTree } from './FileTree'
import type { FileNode } from '@/hooks/useFileTree'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    token: 'test-token',
    user: { id: 'u1' },
    loading: false,
    authenticated: true,
    logout: vi.fn(),
  })),
}))

const mockFiles: FileNode[] = [
  {
    id: '1',
    path: 'src/index.ts',
    content: '',
    mimeType: 'text/typescript',
    sizeBytes: 0,
    updatedAt: '',
  },
  {
    id: '2',
    path: 'src/app/page.tsx',
    content: '',
    mimeType: 'text/typescript',
    sizeBytes: 0,
    updatedAt: '',
  },
  {
    id: '3',
    path: 'README.md',
    content: '',
    mimeType: 'text/markdown',
    sizeBytes: 0,
    updatedAt: '',
  },
]

const defaultProps = {
  files: [],
  activeFilePath: null,
  onFileClick: vi.fn(),
  onCreateFile: vi.fn(),
  onCreateFolder: vi.fn(),
  onRenameFile: vi.fn(),
  onDeleteFile: vi.fn(),
}

describe('FileTree', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders empty state when no files', () => {
    render(<FileTree {...defaultProps} />)
    expect(screen.getByText(/No files yet/i)).toBeInTheDocument()
  })

  it('renders file names from flat path list', () => {
    render(<FileTree {...defaultProps} files={mockFiles} />)
    // Root-level files are always visible
    expect(screen.getByText('README.md')).toBeInTheDocument()
    // Files inside root-level folders (src/ is root → expanded by default)
    expect(screen.getByText('index.ts')).toBeInTheDocument()
  })

  it('clicking a file calls onFileClick with the correct file', () => {
    const onFileClick = vi.fn()
    render(<FileTree {...defaultProps} files={mockFiles} onFileClick={onFileClick} />)
    fireEvent.click(screen.getByText('README.md'))
    expect(onFileClick).toHaveBeenCalledTimes(1)
    expect(onFileClick).toHaveBeenCalledWith(mockFiles[2])
  })
})
