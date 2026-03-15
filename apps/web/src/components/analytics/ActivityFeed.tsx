'use client'

const EVENT_ICONS: Record<string, string> = {
  ai_request: '🤖',
  deployment_created: '🚀',
  project_created: '📁',
  template_cloned: '📋',
  member_invited: '👋',
  file_saved: '💾',
  snapshot_created: '📸',
  github_push: '🔗',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EVENT_LABELS: Record<string, (e: any) => string> = {
  ai_request: () => 'AI request sent',
  deployment_created: (e) => `Deployed to ${(e.metadata?.provider as string) ?? 'provider'}`,
  project_created: (e) => `Created project "${(e.projectName as string) ?? 'Unknown'}"`,
  template_cloned: (e) => `Cloned template "${(e.metadata?.templateName as string) ?? ''}"`,
  member_invited: (e) => `Invited ${(e.metadata?.inviteeEmail as string) ?? 'member'}`,
  file_saved: () => 'File saved',
  snapshot_created: () => 'Snapshot created',
  github_push: () => 'Pushed to GitHub',
}

interface Event {
  id: string
  eventType: string
  metadata: Record<string, unknown>
  createdAt: string
  userEmail: string | null
  projectName: string | null
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function ActivityFeed({ events, loading }: { events: Event[]; loading?: boolean }) {
  if (loading) return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-3 animate-pulse">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-gray-100 rounded w-3/4" />
            <div className="h-2.5 bg-gray-100 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )

  if (!events.length) return <p className="text-sm text-gray-400 text-center py-8">No recent activity</p>

  return (
    <ul className="space-y-3">
      {events.map(event => (
        <li key={event.id} className="flex items-start gap-3">
          <span className="text-lg flex-shrink-0 w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center">
            {EVENT_ICONS[event.eventType] ?? '📌'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-800">
              {(EVENT_LABELS[event.eventType] ?? (() => event.eventType))(event)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {event.userEmail ?? 'System'} · {timeAgo(event.createdAt)}
              {event.projectName && ` · ${event.projectName}`}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}
