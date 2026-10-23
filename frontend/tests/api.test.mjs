import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { api, setSession, clearSession, hasSession } from '../src/lib/api.js'

const stored = new Map()
globalThis.sessionStorage = {
  getItem: key => stored.get(key) || null,
  setItem: (key, value) => stored.set(key, value),
  removeItem: key => stored.delete(key),
}
globalThis.window = new EventTarget()
const response = (data, status = 200) => new Response(JSON.stringify(data), { status })
beforeEach(() => clearSession())

test('public requests omit authorization', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/caregivers/1')
    assert.equal(options.headers.Authorization, undefined)
    return response({ profile: { name: 'Nanny' } })
  }
  assert.equal((await api('/caregivers/1', { authenticated: false })).profile.name, 'Nanny')
})

test('expired access token refreshes and retries', async () => {
  setSession({ access_token: 'old', refresh_token: 'refresh' })
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push(url)
    if (url.endsWith('/refresh')) {
      assert.equal(options.headers.Authorization, 'Bearer refresh')
      return response({ access_token: 'new' })
    }
    return options.headers.Authorization === 'Bearer old'
      ? response({ error: 'expired' }, 401) : response({ user: { id: 1 } })
  }
  assert.equal((await api('/auth/me')).user.id, 1)
  assert.deepEqual(calls, ['/api/auth/me', '/api/auth/refresh', '/api/auth/me'])
})

test('parallel requests after reload share a refresh', async () => {
  sessionStorage.setItem('mlezi-session', 'refresh')
  let refreshCount = 0
  globalThis.fetch = async url => {
    if (url.endsWith('/refresh')) { refreshCount++; return response({ access_token: 'new' }) }
    return response({ ok: true })
  }
  await Promise.all([api('/auth/me'), api('/caregivers/profile')])
  assert.equal(refreshCount, 1)
})

test('expired refresh token signs out and emits session event', async () => {
  sessionStorage.setItem('mlezi-session', 'expired')
  let expired = false
  window.addEventListener('mlezi-session-expired', () => { expired = true }, { once: true })
  globalThis.fetch = async () => response({ error: 'expired' }, 401)
  await assert.rejects(api('/auth/me'), { status: 401 })
  assert.equal(hasSession(), false)
  assert.equal(expired, true)
})

test('network failure preserves refresh token for retry', async () => {
  sessionStorage.setItem('mlezi-session', 'refresh')
  globalThis.fetch = async () => { throw new TypeError('offline') }
  await assert.rejects(api('/auth/me'), { status: 0 })
  assert.equal(hasSession(), true)
})

test('multipart requests do not override browser content type', async () => {
  setSession({ access_token: 'valid', refresh_token: 'refresh' })
  const body = new FormData()
  body.set('name', 'Updated')
  globalThis.fetch = async (url, options) => {
    assert.equal(options.body, body)
    assert.equal(options.headers['Content-Type'], undefined)
    return response({ profile: { name: 'Updated' } })
  }
  assert.equal((await api('/caregivers/profile', { method: 'PUT', body })).profile.name, 'Updated')
})
