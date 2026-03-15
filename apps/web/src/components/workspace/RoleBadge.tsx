'use client'

const ROLE_STYLES: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-800',
  editor: 'bg-blue-100 text-blue-800',
  viewer: 'bg-gray-100 text-gray-700',
  member: 'bg-gray-100 text-gray-700',
}

export function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_STYLES[role] ?? ROLE_STYLES.viewer}`}
    >
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  )
}
