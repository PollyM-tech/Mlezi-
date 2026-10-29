import { ConvexReactClient } from 'convex/react'

let client

// Shared authenticated client for all Convex application functions.
export function getConvexClient() {
  const url = import.meta.env.VITE_CONVEX_URL
  if (!url) throw new Error('VITE_CONVEX_URL must be configured before enabling Convex.')
  if (!client) client = new ConvexReactClient(url)
  return client
}
