const BASE = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '')
const STORAGE_KEY = 'mlezi-session'
let accessToken = null
let refreshTask = null
let generation = 0

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

export function hasSession() {
  return Boolean(sessionStorage.getItem(STORAGE_KEY))
}

export function setSession(data) {
  generation += 1
  accessToken = data.access_token
  sessionStorage.setItem(STORAGE_KEY, data.refresh_token)
}

export function clearSession() {
  generation += 1
  accessToken = null
  sessionStorage.removeItem(STORAGE_KEY)
}

async function decode(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(data.error || 'Something went wrong. Please try again.', response.status)
  return data
}

async function refresh() {
  if (!refreshTask) {
    const current = generation
    const token = sessionStorage.getItem(STORAGE_KEY)
    if (!token) throw new ApiError('Please sign in to continue.', 401)
    refreshTask = fetch(`${BASE}/auth/refresh`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    }).then(decode).then(data => {
      if (current !== generation) throw new ApiError('Your session has changed. Please sign in again.', 401)
      accessToken = data.access_token
    }).finally(() => { refreshTask = null })
  }
  return refreshTask
}

export async function api(path, { method = 'GET', body, authenticated = true } = {}) {
  const send = () => fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(authenticated && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  })
  try {
    if (authenticated && !accessToken) await refresh()
    let response = await send()
    if (authenticated && response.status === 401) {
      await refresh()
      response = await send()
    }
    return await decode(response)
  } catch (error) {
    if (authenticated && error.status === 401) {
      clearSession()
      window.dispatchEvent(new Event('mlezi-session-expired'))
    }
    if (error instanceof TypeError) throw new ApiError('Unable to reach Mlezi. Check your connection and try again.', 0)
    throw error
  }
}
