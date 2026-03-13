import Keycloak from 'keycloak-js'

let keycloakInstance: Keycloak | null = null
let initCalled = false  // set to true before kc.init() — never reset
let initPromise: Promise<{ authenticated: boolean; token?: string }> | null = null

export function getKeycloak(): Keycloak {
  if (!keycloakInstance) {
    keycloakInstance = new Keycloak({
      url: process.env.NEXT_PUBLIC_KEYCLOAK_URL ?? 'http://localhost:8081',
      realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM ?? 'forge',
      clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? 'forge-web',
    })
  }
  return keycloakInstance
}

/**
 * Initialise Keycloak exactly once. Safe to call from multiple components
 * (AuthProvider + AuthCallbackPage) — subsequent calls return the cached promise.
 * initCalled is NEVER reset so kc.init() is only ever called once per page load.
 */
export async function initAuth(): Promise<{ authenticated: boolean; token?: string }> {
  if (initPromise) return initPromise

  // kc.init() was already called but promise was somehow lost — return current state
  if (initCalled) {
    const kc = getKeycloak()
    return { authenticated: kc.authenticated ?? false, token: kc.token }
  }

  initCalled = true
  const kc = getKeycloak()

  initPromise = kc
    .init({
      onLoad: 'check-sso',
      pkceMethod: 'S256',
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
      checkLoginIframe: false,
    })
    .then((authenticated) => ({ authenticated, token: kc.token }))
    .catch((err) => {
      console.error('[auth] Keycloak init error:', err)
      // Do NOT clear initPromise — kc.init() cannot be called again
      return { authenticated: false }
    })

  return initPromise
}

/**
 * Redirect to Keycloak login, routing the callback through /auth/callback.
 */
export function login(next = '/dashboard', idpHint?: string) {
  const callbackUri = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
  getKeycloak().login({ redirectUri: callbackUri, ...(idpHint && { idpHint }) })
}

export function logout() {
  getKeycloak().logout({ redirectUri: window.location.origin })
}

export function getToken(): string | undefined {
  return getKeycloak().token
}
