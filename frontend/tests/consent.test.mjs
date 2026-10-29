import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { getConsent, optionalStorageAllowed, saveConsent, clearOptionalStorage, CONSENT_COOKIE } from '../src/lib/consent.js'
import { readSearch, writeSearch } from '../src/lib/search.js'

let cookieValue, lastWrite, stored
beforeEach(() => {
  cookieValue = ''; lastWrite = ''; stored = new Map()
  globalThis.document = {}
  Object.defineProperty(document, 'cookie', { configurable: true, get: () => cookieValue,
    set: value => { lastWrite = value; cookieValue = value.split(';')[0] } })
  globalThis.window = new EventTarget()
  window.location = { protocol: 'http:' }
  globalThis.sessionStorage = {
    get length() { return stored.size }, key: index => [...stored.keys()][index],
    getItem: key => stored.get(key) || null, setItem: (key,value) => stored.set(key,value), removeItem: key => stored.delete(key),
  }
  saveConsent('declined'); cookieValue = ''; lastWrite = ''
})

test('optional use is off before a choice and for malformed/old choices', () => {
  assert.equal(getConsent(), 'unknown'); assert.equal(optionalStorageAllowed(), false)
  for (const value of ['v0.accepted', 'v1.invalid', 'accepted']) {
    cookieValue = `${CONSENT_COOKIE}=${value}`
    assert.equal(optionalStorageAllowed(), false)
  }
})
test('accept sets a versioned 180-day same-site host-only preference cookie', () => {
  assert.equal(saveConsent('accepted'), true)
  assert.equal(getConsent(), 'accepted')
  assert.equal(optionalStorageAllowed(), true)
  assert.match(lastWrite, /Max-Age=15552000/); assert.match(lastWrite, /Path=\//); assert.match(lastWrite, /SameSite=Lax/)
  assert.equal(lastWrite.includes('Domain='), false)
})
test('production HTTPS adds Secure', () => {
  window.location.protocol = 'https:'; saveConsent('accepted')
  assert.match(lastWrite, /; Secure$/)
})
test('decline clears only optional searches, preserving sign-in and unrelated storage', () => {
  stored.set('mlezi-session', 'refresh-token')
  stored.set('mlezi-search-1', 'saved filters'); stored.set('mlezi-search-public', 'saved filters'); stored.set('unrelated', 'keep')
  assert.equal(saveConsent('declined'), true)
  assert.equal(optionalStorageAllowed(), false)
  assert.equal(stored.has('mlezi-search-1'), false); assert.equal(stored.has('mlezi-search-public'), false)
  assert.equal(stored.get('mlezi-session'), 'refresh-token'); assert.equal(stored.get('unrelated'), 'keep')
})
test('searches are not persisted or restored without acceptance', () => {
  writeSearch(1, { filters: { category: 'nanny' }, page: 1 })
  assert.equal(stored.size, 0)
  stored.set('mlezi-search-1', JSON.stringify({ filters: { category: 'nanny' } }))
  assert.equal(readSearch(1).filters.category, '')
  saveConsent('accepted'); writeSearch(1, { filters: { category: 'nanny' }, page: 1 })
  assert.equal(readSearch(1).filters.category, 'nanny')
  saveConsent('declined'); assert.equal(readSearch(1).filters.category, '')
})
test('blocked cookies remain off and report unsuccessful persistence', () => {
  Object.defineProperty(document, 'cookie', { get: () => '', set: () => {} })
  assert.equal(saveConsent('accepted'), false); assert.equal(optionalStorageAllowed(), false)
})
test('cookie parser handles other cookies and consent changes notify the UI', () => {
  cookieValue = `another=value; ${CONSENT_COOKIE}=v1.declined; last=thing`
  assert.equal(getConsent(), 'declined')
  let events = 0; window.addEventListener('mlezi-consent-changed', () => events++)
  saveConsent('accepted'); saveConsent('declined'); assert.equal(events, 2)
  assert.throws(() => saveConsent('anything'), /Choose/)
  assert.doesNotThrow(clearOptionalStorage)
})

test('revocation stops optional use when an old accepted cookie cannot be overwritten', () => {
  saveConsent('accepted')
  Object.defineProperty(document, 'cookie', { get: () => `${CONSENT_COOKIE}=v1.accepted`, set: () => {} })
  assert.equal(saveConsent('declined'), false)
  assert.equal(optionalStorageAllowed(), false)
  assert.equal(getConsent(), 'declined')
})


test('duplicate consent cookies fail closed instead of accepting the first value', () => {
  for (const values of [['v1.accepted','v1.declined'], ['v1.accepted','v1.accepted']]) {
    cookieValue = values.map(value => `${CONSENT_COOKIE}=${value}`).join('; ')
    assert.equal(getConsent(), 'unknown')
    assert.equal(optionalStorageAllowed(), false)
  }
})
