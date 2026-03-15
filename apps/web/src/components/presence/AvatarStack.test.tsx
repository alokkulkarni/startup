import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AvatarStack } from './AvatarStack'

const users = [
  { userId: 'u-1', email: 'alice@example.com' },
  { userId: 'u-2', email: 'bob@example.com' },
  { userId: 'u-3', email: 'carol@example.com' },
]

describe('AvatarStack', () => {
  it('renders avatars for each user', () => {
    render(<AvatarStack users={users} />)
    // Each user's initials should appear
    expect(screen.getByText('AL')).toBeDefined()
    expect(screen.getByText('BO')).toBeDefined()
    expect(screen.getByText('CA')).toBeDefined()
  })

  it('shows correct initials from email', () => {
    render(<AvatarStack users={[{ userId: 'u-1', email: 'john@example.com' }]} />)
    expect(screen.getByText('JO')).toBeDefined()
  })

  it('shows email as tooltip (title attribute)', () => {
    const { container } = render(<AvatarStack users={users} />)
    const el = container.querySelector('[title="alice@example.com"]')
    expect(el).toBeTruthy()
  })

  it('shows overflow count when users exceed maxVisible', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      userId: `u-${i}`,
      email: `user${i}@example.com`,
    }))
    render(<AvatarStack users={many} maxVisible={5} />)
    expect(screen.getByText('+3')).toBeDefined()
  })

  it('does not show overflow when users within maxVisible', () => {
    render(<AvatarStack users={users} maxVisible={5} />)
    expect(screen.queryByText(/^\+\d/)).toBeNull()
  })

  it('shows online count text', () => {
    render(<AvatarStack users={users} />)
    expect(screen.getByText('3 online')).toBeDefined()
  })

  it('renders nothing extra when users is empty', () => {
    const { container } = render(<AvatarStack users={[]} />)
    expect(container.querySelectorAll('[title]').length).toBe(0)
    expect(screen.queryByText(/online/)).toBeNull()
  })

  it('applies md size classes when size is md', () => {
    const { container } = render(
      <AvatarStack users={users.slice(0, 1)} size="md" />,
    )
    const avatar = container.querySelector('.w-9')
    expect(avatar).toBeTruthy()
  })

  it('applies sm size classes by default', () => {
    const { container } = render(<AvatarStack users={users.slice(0, 1)} />)
    const avatar = container.querySelector('.w-7')
    expect(avatar).toBeTruthy()
  })
})
