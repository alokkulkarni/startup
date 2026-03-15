import type { FastifyBaseLogger } from 'fastify'
import * as schema from '../db/schema.js'

export interface AnalyticsEvent {
  workspaceId?: string | null
  projectId?: string | null
  userId?: string | null
  eventType:
    | 'ai_request'
    | 'deployment_created'
    | 'project_created'
    | 'template_cloned'
    | 'member_invited'
    | 'file_saved'
    | 'snapshot_created'
    | 'github_push'
  metadata?: Record<string, unknown>
}

export function trackEvent(
  db: any,
  event: AnalyticsEvent,
  log?: FastifyBaseLogger
): void {
  // Fire-and-forget — never await this, never throws
  try {
    const result = db.insert(schema.analyticsEvents)
      .values({
        workspaceId: event.workspaceId ?? null,
        projectId: event.projectId ?? null,
        userId: event.userId ?? null,
        eventType: event.eventType,
        metadata: event.metadata ?? {},
      })
    if (result && typeof result.catch === 'function') {
      result.catch((err: unknown) => {
        log?.warn({ err }, 'Failed to track analytics event')
      })
    }
  } catch (err) {
    log?.warn({ err }, 'Failed to track analytics event')
  }
}
