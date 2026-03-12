import type { FastifyRequest, FastifyReply } from 'fastify'

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  await (request.server as any).verifyAuth(request, reply)
  return !!request.user
}
