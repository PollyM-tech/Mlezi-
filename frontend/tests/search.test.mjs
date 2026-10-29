import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleanFilters, searchParams, readSearch, writeSearch } from '../src/lib/search.js'
globalThis.document = { cookie: 'mlezi-cookie-consent=v1.accepted' }
const storage = new Map()
globalThis.sessionStorage = { getItem: key => storage.get(key) || null, setItem: (key,value) => storage.set(key,value) }

test('budget includes a pay period and location is removed for live-in requests', () => {
  const params = searchParams({ pay_max: '20000', service_type: 'live_in', location: 'Nairobi' })
  assert.equal(params.get('pay_period'), 'monthly')
  assert.equal(params.has('location'), false)
  assert.equal(searchParams({ service_type: 'live_out', location: 'Nairobi' }).get('location'), 'Nairobi')
})
test('search restoration is scoped per user and preserves page and rotation', () => {
  writeSearch(1, { filters: { category: 'nanny', available_day: 'Monday' }, page: 2, rotation: 'signed' })
  assert.equal(readSearch(1).filters.category, 'nanny')
  assert.equal(readSearch(1).page, 2)
  assert.equal(readSearch(1).rotation, 'signed')
  assert.equal(readSearch(2).filters.category, '')
})
test('expired search retains choices but resets pagination and ranking token', () => {
  storage.set('mlezi-search-3', JSON.stringify({ filters: { category: 'nanny' }, page: 4, rotation: 'old', savedAt: Date.now() - 60*60*1000 }))
  assert.equal(readSearch(3).filters.category, 'nanny')
  assert.equal(readSearch(3).page, 1)
  assert.equal(readSearch(3).rotation, '')
})
test('malformed saved searches and unknown fields do not enter requests', () => {
  storage.set('mlezi-search-4', 'not JSON')
  assert.equal(readSearch(4).page, 1)
  assert.equal(cleanFilters({ user_id: '2', category: 1 }).user_id, undefined)
  assert.equal(cleanFilters({ category: 1 }).category, '')
})
test('storage failures do not prevent browsing', () => {
  const original = globalThis.sessionStorage
  globalThis.sessionStorage = { getItem() { throw new Error('disabled') }, setItem() { throw new Error('full') } }
  assert.equal(readSearch(1).page, 1)
  assert.doesNotThrow(() => writeSearch(1, {}))
  globalThis.sessionStorage = original
})

test('retired options in saved searches use consolidated services', () => {
  for (const [old, current] of Object.entries({ parent_work_support: 'occasional_backup', parent_cooking_support: 'occasional_backup', part_time: 'occasional_backup', emergency_short_notice: 'occasional_backup', overnight_sleep_training: 'overnight', evening: 'occasional_backup', event: 'occasional_backup' })) {
    assert.equal(cleanFilters({ service_type: old }).service_type, current)
  }
  const filters = cleanFilters({ category: 'overnight_sleep_training' })
  assert.equal(filters.category, 'newborn_maternity_nanny')
  assert.equal(filters.service_type, 'overnight')
})
