let convexSession = null
let sessionGeneration = 0

export function configureConvexSession(session) {
  if (session?.identity !== convexSession?.identity || !!session?.authenticated !== !!convexSession?.authenticated) sessionGeneration += 1
  convexSession = session
}

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status }
}

export function hasSession() { return !!convexSession?.authenticated }
export async function clearSession() { await convexSession?.signOut() }

// UI routes are dispatched to native Convex functions, never a Flask HTTP API.
export async function api(path, { method = 'GET', body, authenticated = true } = {}) {
  const session = convexSession, started = sessionGeneration
  const { nativeConvexApi } = await import('./convexApi.js')
  try {
    if (authenticated && !session?.authenticated) throw new ApiError('Please sign in to continue.', 401)
    return await nativeConvexApi(path, { method, body }, session)
  } catch (error) {
    // A request from an earlier account must not sign out a newer session.
    if (started === sessionGeneration) {
      if (error.status === 403 && /authenticator|profile photo/i.test(error.message)) window.dispatchEvent(new Event('mlezi-security-required'))
      if (error.status === 401 && authenticated && session?.authenticated) {
        try { await session.signOut() } catch { /* Still show session recovery. */ }
        if (started === sessionGeneration) window.dispatchEvent(new Event('mlezi-session-expired'))
      }
    }
    if (error instanceof TypeError) throw new ApiError('Unable to reach Mlezi. Check your connection and try again.', 0)
    throw error
  }
}
