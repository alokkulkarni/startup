export interface User {
  id: string
  keycloakId: string
  email: string
  name: string
  avatarUrl: string | null
  plan: PlanTier
  createdAt: string
  updatedAt: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  ownerId: string
  plan: PlanTier
  createdAt: string
}

export interface WorkspaceMember {
  workspaceId: string
  userId: string
  role: WorkspaceRole
  joinedAt: string
}

export type PlanTier = 'free' | 'pro' | 'team' | 'enterprise'
export type WorkspaceRole = 'viewer' | 'member' | 'admin' | 'owner'

export interface AuthSession {
  user: User
  workspace: Workspace
  role: WorkspaceRole
  accessToken: string
}
