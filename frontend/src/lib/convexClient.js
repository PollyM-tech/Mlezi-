import { ConvexReactClient } from 'convex/react'

let client

// Shared authenticated client for all Convex application functions.
export function getConvexClient() {
  const url = import.meta.env.VITE_CONVEX_URL
  if (!url) throw new Error('VITE_CONVEX_URL must be configured before enabling Convex.')
  if (!client) client = new ConvexReactClient(url)
  return client
}

// Leave the retiring connection alive only for its outstanding revocation.
// A new visit to the app receives a fresh client with no private query cache.
export function detachConvexClient(expected) {
  if (client === expected) client = undefined
  expected.clearAuth?.()
}
