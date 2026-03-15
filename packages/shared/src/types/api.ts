export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiError
  meta?: ResponseMeta
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface ResponseMeta {
  page?: number
  pageSize?: number
  total?: number
  cursor?: string
}

export interface PaginationParams {
  page?: number
  pageSize?: number
  cursor?: string
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'down'
  version: string
  timestamp: string
  services: {
    database: 'ok' | 'down'
    redis: 'ok' | 'down'
    storage: 'ok' | 'down'
  }
}
