'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { FileNode } from '@/hooks/useFileTree'
import { cn } from '@/lib/utils'

interface TreeItem {
  name: string
  path: string
  isFolder: boolean
  children: TreeItem[]
  file?: FileNode
}

interface ContextMenuState {
  x: number
  y: number
  item: TreeItem
}

interface FileTreeProps {
  files: FileNode[]
  activeFilePath: string | null
  onFileClick: (file: FileNode) => void
  onCreateFile: (path: string) => void
  onCreateFolder: (path: string) => void
  onRenameFile: (file: FileNode, newPath: string) => void
  onDeleteFile: (file: FileNode) => void
}

function buildTree(files: FileNode[]): TreeItem[] {
  const root: TreeItem[] = []
  const folderMap = new Map<string, TreeItem>()

  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path))

  for (const file of sorted) {
    const parts = file.path.split('/').filter(Boolean)
    let currentLevel = root

    for (let i = 0; i < parts.length - 1; i++) {
      const folderPath = parts.slice(0, i + 1).join('/')
      if (!folderMap.has(folderPath)) {
        const folder: TreeItem = {
          name: parts[i],
          path: folderPath,
          isFolder: true,
          children: [],
        }
        folderMap.set(folderPath, folder)
        currentLevel.push(folder)
      }
      currentLevel = folderMap.get(folderPath)!.children
    }

    currentLevel.push({
      name: parts[parts.length - 1],
      path: file.path,
      isFolder: false,
      children: [],
      file,
    })
  }

  return root
}

function FileIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  const colorMap: Record<string, string> = {
    ts: 'text-blue-400', tsx: 'text-blue-400',
    js: 'text-yellow-300', jsx: 'text-yellow-300',
    css: 'text-purple-400', scss: 'text-purple-400',
    json: 'text-yellow-400',
    md: 'text-gray-400',
    html: 'text-orange-400',
    svg: 'text-green-400',
  }
  const color = colorMap[ext] ?? 'text-gray-300'

  return (
    <svg className={cn('w-3.5 h-3.5 shrink-0', color)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}

function FolderIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="w-3.5 h-3.5 shrink-0 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
    </svg>
  ) : (
    <svg className="w-3.5 h-3.5 shrink-0 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  )
}

interface TreeNodeProps {
  item: TreeItem
  depth: number
  isRootLevel: boolean
  activeFilePath: string | null
  onFileClick: (file: FileNode) => void
  onContextMenu: (e: React.MouseEvent, item: TreeItem) => void
  renamingPath: string | null
  renameValue: string
  onRenameChange: (v: string) => void
  onRenameConfirm: () => void
  onRenameCancel: () => void
  newItemState: NewItemState | null
  onNewItemChange: (v: string) => void
  onNewItemConfirm: () => void
  onNewItemCancel: () => void
}

interface NewItemState {
  parentPath: string
  type: 'file' | 'folder'
  value: string
}

function TreeNode({
  item,
  depth,
  isRootLevel,
  activeFilePath,
  onFileClick,
  onContextMenu,
  renamingPath,
  renameValue,
  onRenameChange,
  onRenameConfirm,
  onRenameCancel,
  newItemState,
  onNewItemChange,
  onNewItemConfirm,
  onNewItemCancel,
}: TreeNodeProps) {
  const [isOpen, setIsOpen] = useState(isRootLevel)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const newItemInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renamingPath === item.path) {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    }
  }, [renamingPath, item.path])

  useEffect(() => {
    if (newItemState?.parentPath === item.path) {
      newItemInputRef.current?.focus()
    }
  }, [newItemState, item.path])

  const indent = depth * 12

  const isRenaming = renamingPath === item.path
  const isActive = !item.isFolder && activeFilePath === item.path

  const showNewItemInput = item.isFolder && isOpen && newItemState?.parentPath === item.path

  if (item.isFolder) {
    return (
      <div>
        <div
          className="flex items-center gap-1 px-2 py-0.5 cursor-pointer hover:bg-gray-700/50 rounded select-none group"
          style={{ paddingLeft: `${indent + 8}px` }}
          onClick={() => setIsOpen(o => !o)}
          onContextMenu={e => onContextMenu(e, item)}
        >
          <svg
            className={cn('w-3 h-3 text-gray-500 shrink-0 transition-transform', isOpen && 'rotate-90')}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <FolderIcon open={isOpen} />
          {isRenaming ? (
            <input
              ref={renameInputRef}
              className="flex-1 bg-gray-700 text-gray-100 text-xs px-1 py-0 rounded border border-indigo-500 outline-none font-mono"
              value={renameValue}
              onChange={e => onRenameChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') onRenameConfirm()
                if (e.key === 'Escape') onRenameCancel()
              }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="text-xs text-gray-300 truncate font-mono">{item.name}</span>
          )}
        </div>
        {isOpen && (
          <div>
            {item.children.map(child => (
              <TreeNode
                key={child.path}
                item={child}
                depth={depth + 1}
                isRootLevel={false}
                activeFilePath={activeFilePath}
                onFileClick={onFileClick}
                onContextMenu={onContextMenu}
                renamingPath={renamingPath}
                renameValue={renameValue}
                onRenameChange={onRenameChange}
                onRenameConfirm={onRenameConfirm}
                onRenameCancel={onRenameCancel}
                newItemState={newItemState}
                onNewItemChange={onNewItemChange}
                onNewItemConfirm={onNewItemConfirm}
                onNewItemCancel={onNewItemCancel}
              />
            ))}
            {showNewItemInput && (
              <div
                className="flex items-center gap-1.5 px-2 py-0.5"
                style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
              >
                {newItemState!.type === 'folder' ? <FolderIcon open={false} /> : <FileIcon name="new" />}
                <input
                  ref={newItemInputRef}
                  className="flex-1 bg-gray-700 text-gray-100 text-xs px-1 py-0 rounded border border-indigo-500 outline-none font-mono"
                  value={newItemState!.value}
                  onChange={e => onNewItemChange(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') onNewItemConfirm()
                    if (e.key === 'Escape') onNewItemCancel()
                  }}
                  placeholder={newItemState!.type === 'folder' ? 'folder-name' : 'filename.ts'}
                />
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2 py-0.5 cursor-pointer rounded select-none group',
        isActive ? 'bg-indigo-500/20 text-indigo-300' : 'hover:bg-gray-700/50 text-gray-300',
      )}
      style={{ paddingLeft: `${indent + 8}px` }}
      onClick={() => item.file && onFileClick(item.file)}
      onContextMenu={e => onContextMenu(e, item)}
    >
      <FileIcon name={item.name} />
      {isRenaming ? (
        <input
          ref={renameInputRef}
          className="flex-1 bg-gray-700 text-gray-100 text-xs px-1 py-0 rounded border border-indigo-500 outline-none font-mono"
          value={renameValue}
          onChange={e => onRenameChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') onRenameConfirm()
            if (e.key === 'Escape') onRenameCancel()
          }}
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <span className={cn('text-xs truncate font-mono', isActive ? 'text-indigo-300' : 'text-gray-300')}>
          {item.name}
        </span>
      )}
    </div>
  )
}

export function FileTree({
  files,
  activeFilePath,
  onFileClick,
  onCreateFile,
  onCreateFolder,
  onRenameFile,
  onDeleteFile,
}: FileTreeProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [renamingPath, setRenamingPath] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [newItemState, setNewItemState] = useState<NewItemState | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  const tree = buildTree(files)

  // Close context menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    if (contextMenu) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [contextMenu])

  const handleContextMenu = useCallback((e: React.MouseEvent, item: TreeItem) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, item })
  }, [])

  const startRename = useCallback((item: TreeItem) => {
    setContextMenu(null)
    setRenamingPath(item.path)
    setRenameValue(item.name)
  }, [])

  const confirmRename = useCallback(() => {
    if (!renamingPath || !renameValue.trim()) {
      setRenamingPath(null)
      return
    }
    const parts = renamingPath.split('/')
    parts[parts.length - 1] = renameValue.trim()
    const newPath = parts.join('/')
    if (newPath !== renamingPath) {
      const file = files.find(f => f.path === renamingPath)
      if (file) onRenameFile(file, newPath)
    }
    setRenamingPath(null)
  }, [renamingPath, renameValue, files, onRenameFile])

  const cancelRename = useCallback(() => {
    setRenamingPath(null)
  }, [])

  const startNewItem = useCallback((parentPath: string, type: 'file' | 'folder') => {
    setContextMenu(null)
    setNewItemState({ parentPath, type, value: '' })
  }, [])

  const confirmNewItem = useCallback(() => {
    if (!newItemState || !newItemState.value.trim()) {
      setNewItemState(null)
      return
    }
    const parent = newItemState.parentPath
    const name = newItemState.value.trim()
    const fullPath = parent ? `${parent}/${name}` : name
    if (newItemState.type === 'file') {
      onCreateFile(fullPath)
    } else {
      onCreateFolder(fullPath)
    }
    setNewItemState(null)
  }, [newItemState, onCreateFile, onCreateFolder])

  const cancelNewItem = useCallback(() => {
    setNewItemState(null)
  }, [])

  const handleNewFileAtRoot = useCallback(() => {
    setNewItemState({ parentPath: '', type: 'file', value: '' })
  }, [])

  const nodeProps = {
    activeFilePath,
    onFileClick,
    onContextMenu: handleContextMenu,
    renamingPath,
    renameValue,
    onRenameChange: setRenameValue,
    onRenameConfirm: confirmRename,
    onRenameCancel: cancelRename,
    newItemState,
    onNewItemChange: (v: string) => setNewItemState(s => s ? { ...s, value: v } : s),
    onNewItemConfirm: confirmNewItem,
    onNewItemCancel: cancelNewItem,
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 select-none">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Files</span>
        <button
          onClick={handleNewFileAtRoot}
          className="text-gray-400 hover:text-gray-200 transition-colors"
          title="New File"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {files.length === 0 && !newItemState ? (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-gray-500">No files yet. Create your first file.</p>
          </div>
        ) : (
          <>
            {tree.map(item => (
              <TreeNode
                key={item.path}
                item={item}
                depth={0}
                isRootLevel
                {...nodeProps}
              />
            ))}
            {/* Root-level new item input */}
            {newItemState && newItemState.parentPath === '' && (
              <div className="flex items-center gap-1.5 px-2 py-0.5" style={{ paddingLeft: '8px' }}>
                {newItemState.type === 'folder' ? <FolderIcon open={false} /> : <FileIcon name="new" />}
                <input
                  autoFocus
                  className="flex-1 bg-gray-700 text-gray-100 text-xs px-1 py-0 rounded border border-indigo-500 outline-none font-mono"
                  value={newItemState.value}
                  onChange={e => setNewItemState(s => s ? { ...s, value: e.target.value } : s)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') confirmNewItem()
                    if (e.key === 'Escape') cancelNewItem()
                  }}
                  placeholder={newItemState.type === 'folder' ? 'folder-name' : 'filename.ts'}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-36 text-xs"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.item.isFolder && (
            <>
              <button
                className="w-full text-left px-3 py-1.5 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                onClick={() => startNewItem(contextMenu.item.path, 'file')}
              >
                New File
              </button>
              <button
                className="w-full text-left px-3 py-1.5 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                onClick={() => startNewItem(contextMenu.item.path, 'folder')}
              >
                New Folder
              </button>
              <div className="border-t border-gray-700 my-1" />
            </>
          )}
          <button
            className="w-full text-left px-3 py-1.5 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            onClick={() => startRename(contextMenu.item)}
          >
            Rename
          </button>
          {!contextMenu.item.isFolder && contextMenu.item.file && (
            <button
              className="w-full text-left px-3 py-1.5 text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors"
              onClick={() => {
                onDeleteFile(contextMenu.item.file!)
                setContextMenu(null)
              }}
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}
