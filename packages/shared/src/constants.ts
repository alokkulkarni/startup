export const APP_NAME = 'Forge AI'
export const APP_VERSION = '0.1.0'

export const API_VERSION = 'v1'
export const API_PREFIX = `/api/${API_VERSION}`

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50MB
export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024 // 2MB
export const MAX_PROJECT_FILES = 1000
export const MAX_SNAPSHOT_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

export const SUPPORTED_FRAMEWORKS = ['react', 'nextjs', 'vue', 'svelte', 'vanilla'] as const
export const SUPPORTED_DEPLOY_PROVIDERS = ['vercel', 'netlify', 'cloudflare-pages'] as const

export const AI_MAX_TOKENS = 8096
export const AI_CONTEXT_WINDOW_TOKENS = 180000

export const RATE_LIMITS = {
  AI_CHAT: { requests: 10, windowMs: 60_000 },
  API_DEFAULT: { requests: 100, windowMs: 60_000 },
  AUTH: { requests: 20, windowMs: 900_000 },
} as const

export const REDIS_KEYS = {
  rateLimit: (userId: string, action: string) => `rl:${action}:${userId}`,
  aiUsage: (userId: string, date: string) => `ai:usage:${userId}:${date}`,
  session: (sessionId: string) => `session:${sessionId}`,
  projectCache: (projectId: string) => `project:${projectId}`,
} as const
