import type { FileSystemTree, DirectoryNode } from '@webcontainer/api'
import type { FileNode } from '@/hooks/useFileTree'

export function buildFsTree(files: FileNode[]): FileSystemTree {
  const tree: FileSystemTree = {}
  for (const file of files) {
    const parts = file.path.replace(/^\//, '').split('/')
    let current: FileSystemTree = tree
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (!current[part]) {
        current[part] = { directory: {} }
      }
      current = (current[part] as DirectoryNode).directory
    }
    const filename = parts[parts.length - 1]
    current[filename] = { file: { contents: file.content } }
  }
  return tree
}
