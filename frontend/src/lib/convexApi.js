import { api as functions } from '../../convex/_generated/api.js'
import { getConvexClient } from './convexClient.js'

const site = import.meta.env.VITE_CONVEX_SITE_URL
async function fileRequest(session, path, options = {}) {
  const token = await session?.fetchToken(false)
  if (!token) throw Object.assign(new Error('Please sign in again.'), { status: 401 })
  const response = await fetch(`${site}${path}`, { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } })
  if (!response.ok) { const data = await response.json().catch(() => ({})); throw Object.assign(new Error(data.error || 'Unable to access this file.'), { status: response.status }) }
  return response
}
export async function nativeConvexApi(path, { method = 'GET', body } = {}, session) {
  const url = new URL(path, 'https://mlezi.local')
  const client = getConvexClient()
  const params = Object.fromEntries(url.searchParams)
  try {
    const documents = url.pathname.match(/^\/admin\/verification\/([^/]+)\/documents$/)
    if (documents && method === 'GET') {
      const urls = []
      try {
        for (const kind of ['national_id', 'selfie']) {
          const response = await fileRequest(session, `/files/document?submissionId=${encodeURIComponent(documents[1])}&kind=${kind}`)
          urls.push(URL.createObjectURL(await response.blob()))
        }
        return { documents: { national_id: urls[0], selfie: urls[1] }, expires_in: 60 }
      } catch (error) { urls.forEach(URL.revokeObjectURL); throw error }
    }
    if (method === 'GET') return await client.query(functions.marketplace.read, { path: url.pathname, params })
    if (body instanceof FormData) {
      const fields = {}
      for (const [key, value] of body.entries()) {
        if (value instanceof Blob) {
          if (!value.size) continue
          const response = await fileRequest(session, '/files/upload', { method: 'POST', headers: { 'Content-Type': value.type, 'X-Upload-Purpose': key }, body: value })
          fields[key] = (await response.json()).storageId
        } else fields[key] = value
      }
      body = fields
    }
    return await client.mutation(functions.marketplace.write, { path: url.pathname, method, body: body || {} })
  } catch (error) {
    if (error.data) throw Object.assign(new Error(typeof error.data === 'string' ? error.data : error.data.message), { status: error.data.status || (/sign in|session has expired|Verify your email/.test(String(error.data)) ? 401 : 403) })
    throw error
  }
}
