import type { FastifyRequest, FastifyReply } from 'fastify'

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  await (request.server as any).verifyAuth(request, reply)
  if (!request.user) {
    throw new Error('Unauthenticated — should not reach here')
  }
}
