'use client'

const COLORS = [
  'bg-red-400',
  'bg-orange-400',
  'bg-amber-400',
  'bg-green-400',
  'bg-teal-400',
  'bg-blue-400',
  'bg-indigo-400',
  'bg-purple-400',
]

function getColor(userId: string): string {
  const idx = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % COLORS.length
  return COLORS[idx]
}

function getInitials(email: string): string {
  const name = email.split('@')[0]
  return name.slice(0, 2).toUpperCase()
}

interface OnlineUser {
  userId: string
  email: string
}

interface Props {
  users: OnlineUser[]
  maxVisible?: number
  size?: 'sm' | 'md'
}

export function AvatarStack({ users, maxVisible = 5, size = 'sm' }: Props) {
  const visible = users.slice(0, maxVisible)
  const overflow = users.length - visible.length
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'

  return (
    <div className="flex items-center -space-x-2">
      {visible.map(user => (
        <div
          key={user.userId}
          title={user.email}
          className={`${sizeClass} ${getColor(user.userId)} rounded-full flex items-center justify-center text-white font-semibold ring-2 ring-white`}
        >
          {getInitials(user.email)}
        </div>
      ))}
      {overflow > 0 && (
        <div
          className={`${sizeClass} bg-gray-300 rounded-full flex items-center justify-center text-gray-700 font-semibold ring-2 ring-white`}
        >
          +{overflow}
        </div>
      )}
      {users.length > 0 && (
        <span className="ml-3 text-xs text-gray-500">{users.length} online</span>
      )}
    </div>
  )
}
