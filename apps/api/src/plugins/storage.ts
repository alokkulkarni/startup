import fp from 'fastify-plugin'
import { S3Client, CreateBucketCommand, HeadBucketCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export interface StorageService {
  uploadFile(bucket: string, key: string, body: Buffer, contentType: string): Promise<void>
  getPresignedUrl(bucket: string, key: string, expiresIn?: number): Promise<string>
  ensureBuckets(): Promise<void>
}

declare module 'fastify' {
  interface FastifyInstance {
    storage: StorageService
  }
}

export const storagePlugin = fp(async app => {
  const s3 = new S3Client({
    endpoint: `http${process.env.MINIO_USE_SSL === 'true' ? 's' : ''}://${process.env.MINIO_ENDPOINT ?? 'localhost'}:${process.env.MINIO_PORT ?? '9000'}`,
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
      secretAccessKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
    },
    forcePathStyle: true,
  })

  const storage: StorageService = {
    async uploadFile(bucket, key, body, contentType) {
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }))
    },
    async getPresignedUrl(bucket, key, expiresIn = 3600) {
      return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn })
    },
    async ensureBuckets() {
      const buckets = [
        process.env.MINIO_BUCKET_AVATARS ?? 'avatars',
        process.env.MINIO_BUCKET_SNAPSHOTS ?? 'snapshots',
        process.env.MINIO_BUCKET_ASSETS ?? 'assets',
      ]
      for (const bucket of buckets) {
        try {
          await s3.send(new HeadBucketCommand({ Bucket: bucket }))
        } catch {
          await s3.send(new CreateBucketCommand({ Bucket: bucket }))
          app.log.info(`Created MinIO bucket: ${bucket}`)
        }
      }
    },
  }

  await storage.ensureBuckets()
  app.decorate('storage', storage)
  app.log.info('MinIO storage initialized')
})
