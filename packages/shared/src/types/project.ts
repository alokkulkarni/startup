export interface Project {
  id: string
  workspaceId: string
  name: string
  description: string | null
  framework: ProjectFramework
  status: ProjectStatus
  thumbnail: string | null
  createdAt: string
  updatedAt: string
}

export interface ProjectFile {
  projectId: string
  path: string
  content: string
  mimeType: string
  sizeBytes: number
  updatedAt: string
}

export interface ProjectSnapshot {
  id: string
  projectId: string
  label: string | null
  filesJson: Record<string, string>
  createdAt: string
}

export interface Deployment {
  id: string
  projectId: string
  provider: DeployProvider
  status: DeployStatus
  deployUrl: string | null
  buildLogs: string | null
  createdAt: string
  completedAt: string | null
}

export type ProjectFramework = 'react' | 'nextjs' | 'vue' | 'svelte' | 'vanilla' | 'node' | 'angular' | 'flutter'
export type ProjectStatus = 'active' | 'archived' | 'deleted'
export type DeployProvider = 'vercel' | 'netlify' | 'cloudflare-pages'
export type DeployStatus = 'pending' | 'building' | 'deployed' | 'failed' | 'cancelled'
