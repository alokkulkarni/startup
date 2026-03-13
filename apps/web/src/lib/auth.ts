import Keycloak from 'keycloak-js'

let keycloakInstance: Keycloak | null = null
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

// Idempotent — safe to call multiple times; only initialises once.
export async function initAuth(): Promise<{ authenticated: boolean; token?: string }> {
  if (initPromise) return initPromise

  const kc = getKeycloak()
  initPromise = kc
    .init({
      onLoad: 'check-sso',
      pkceMethod: 'S256',
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
      checkLoginIframe: false,
    })
    .then((authenticated) => ({ authenticated, token: kc.token }))
    .catch(() => {
      initPromise = null // allow retry on transient failure
      return { authenticated: false }
    })

  return initPromise
}

export function login() {
  getKeycloak().login({ redirectUri: `${window.location.origin}/dashboard` })
}

export function logout() {
  getKeycloak().logout({ redirectUri: window.location.origin })
}

export function getToken(): string | undefined {
  return getKeycloak().token
}
