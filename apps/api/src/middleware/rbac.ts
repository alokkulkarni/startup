import type { FastifyRequest, FastifyReply } from 'fastify'

export type WorkspaceRole = 'owner' | 'editor' | 'viewer'

const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  owner: 3,
  editor: 2,
  viewer: 1,
}

export function canPerform(userRole: string, requiredRole: WorkspaceRole): boolean {
  return (ROLE_HIERARCHY[userRole as WorkspaceRole] ?? 0) >= ROLE_HIERARCHY[requiredRole]
}

export async function getWorkspaceMembership(
  db: any,
  userId: string,
  workspaceId: string
) {
  return db.query.workspaceMembers.findFirst({
    where: (m: any, { and, eq }: any) => and(eq(m.userId, userId), eq(m.workspaceId, workspaceId)),
  })
}

export function requireWorkspaceRole(minRole: WorkspaceRole) {
  return async (
    request: FastifyRequest<{ Params: { workspaceId?: string; id?: string } }>,
    reply: FastifyReply
  ) => {
    const user = (request as any).user
    if (!user) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }
    const workspaceId = request.params.workspaceId ?? request.params.id ?? user.workspaceId
    const membership = await getWorkspaceMembership((request as any).server.db, user.id, workspaceId)
    if (!membership) {
      return reply.code(403).send({ error: 'Not a workspace member' })
    }
    if (!canPerform(membership.role, minRole)) {
      return reply.code(403).send({ error: `Requires ${minRole} role or higher` })
    }
    ;(request as any).workspaceMembership = membership
  }
}
