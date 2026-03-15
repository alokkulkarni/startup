const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost/api'

export async function initAuth(): Promise<{ authenticated: boolean }> {
  try {
    const res = await fetch(`${API}/v1/users/me`, { credentials: 'include' })
    return { authenticated: res.ok }
  } catch {
    return { authenticated: false }
  }
}

export function login(next = '/dashboard', provider: 'github' | 'google' | 'email' = 'github') {
  window.location.href = `${API}/v1/auth/${provider}/authorize?next=${encodeURIComponent(next)}`
}

export async function logout(): Promise<void> {
  await fetch(`${API}/v1/auth/logout`, { method: 'POST', credentials: 'include' })
  window.location.href = '/'
}

// Legacy — cookies are sent automatically; this is only needed for code that explicitly sets the header
export function getToken(): string | undefined {
  return undefined
}
