'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/lib/api'

export interface FileNode {
  id: string
  path: string
  content: string
  mimeType: string
  sizeBytes: number
  updatedAt: string
}

interface UseFileTreeReturn {
  files: FileNode[]
  isLoading: boolean
  error: string | null
  activeFile: FileNode | null
  setActiveFile: (file: FileNode | null) => void
  refreshFiles: () => Promise<FileNode[]>
  createFile: (path: string, content?: string) => Promise<FileNode>
  updateFile: (path: string, content: string) => Promise<void>
  deleteFile: (path: string) => Promise<void>
  renameFile: (oldPath: string, newPath: string) => Promise<void>
}

export function useFileTree(projectId: string, token: string | null): UseFileTreeReturn {
  const [files, setFiles] = useState<FileNode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeFile, setActiveFile] = useState<FileNode | null>(null)

  // Keep a stable ref to current files for use inside callbacks
  const filesRef = useRef<FileNode[]>(files)
  useEffect(() => {
    filesRef.current = files
  }, [files])

  const doFetch = useCallback(async (): Promise<FileNode[]> => {
    const res = await api.get<FileNode[]>(`/v1/projects/${projectId}/files`)
    const updated = res.data ?? []
    setFiles(updated)
    return updated
  }, [projectId])

  const refreshFiles = useCallback(async (): Promise<FileNode[]> => {
    if (!projectId) return []
    setIsLoading(true)
    setError(null)
    try {
      return await doFetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files')
      return []
    } finally {
      setIsLoading(false)
    }
  }, [projectId, doFetch])

  const createFile = useCallback(async (path: string, content = ''): Promise<FileNode> => {
    await api.put(`/v1/projects/${projectId}/files/${encodeURIComponent(path)}`, { content })
    const updated = await doFetch()
    const newFile = updated.find(f => f.path === path) ?? {
      id: path,
      path,
      content,
      mimeType: 'text/plain',
      sizeBytes: content.length,
      updatedAt: new Date().toISOString(),
    }
    setActiveFile(newFile)
    return newFile
  }, [projectId, doFetch])

  const updateFile = useCallback(async (path: string, content: string): Promise<void> => {
    await api.put(
      `/v1/projects/${projectId}/files/${encodeURIComponent(path)}`,
      { content },
    )
  }, [projectId])

  const deleteFile = useCallback(async (path: string): Promise<void> => {
    await api.delete(`/v1/projects/${projectId}/files/${encodeURIComponent(path)}`)
    await doFetch()
    setActiveFile(prev => (prev?.path === path ? null : prev))
  }, [projectId, doFetch])

  const renameFile = useCallback(async (oldPath: string, newPath: string): Promise<void> => {
    const existing = filesRef.current.find(f => f.path === oldPath)
    const content = existing?.content ?? ''
    await api.put(`/v1/projects/${projectId}/files/${encodeURIComponent(newPath)}`, { content })
    await api.delete(`/v1/projects/${projectId}/files/${encodeURIComponent(oldPath)}`)
    const updated = await doFetch()
    const renamedFile = updated.find(f => f.path === newPath)
    if (renamedFile) setActiveFile(renamedFile)
  }, [projectId, doFetch])

  useEffect(() => {
    if (projectId) {
      refreshFiles()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  return {
    files,
    isLoading,
    error,
    activeFile,
    setActiveFile,
    refreshFiles,
    createFile,
    updateFile,
    deleteFile,
    renameFile,
  }
}
