import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { users } from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'

export async function uploadRoutes(app: FastifyInstance) {
  // POST /api/v1/upload/avatar — multipart avatar upload
  app.post('/avatar', {
    schema: {
      tags: ['upload'],
      summary: 'Upload user avatar',
      security: [{ bearerAuth: [] }],
      consumes: ['multipart/form-data'],
    },
  }, async (request, reply) => {
    await requireAuth(request, reply)
    if (!request.user) return

    const data = await request.file?.()
    if (!data) {
      return reply.code(400).send({
        success: false,
        error: { code: 'NO_FILE', message: 'No file provided' },
      })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(data.mimetype)) {
      return reply.code(400).send({
        success: false,
        error: { code: 'INVALID_TYPE', message: 'Only JPEG, PNG, and WebP are allowed' },
      })
    }

    const buffer = await data.toBuffer()

    if (buffer.length > 2 * 1024 * 1024) {
      return reply.code(400).send({
        success: false,
        error: { code: 'FILE_TOO_LARGE', message: 'Avatar must be under 2MB' },
      })
    }

    const key = `${request.user.keycloakId}/avatar-${Date.now()}.${data.mimetype.split('/')[1]}`
    const bucket = process.env.MINIO_BUCKET_AVATARS ?? 'avatars'

    await app.storage.uploadFile(bucket, key, buffer, data.mimetype)
    const avatarUrl = await app.storage.getPresignedUrl(bucket, key, 3600 * 24 * 365) // 1 year

    // Update user record
    await app.db
      .update(users)
      .set({ avatarUrl, updatedAt: new Date() })
      .where(eq(users.keycloakId, request.user.keycloakId))

    return reply.send({ success: true, data: { avatarUrl } })
  })
}
