import { optionalStorageAllowed } from './consent.js'

export const EMPTY_FILTERS = {
  travel_scope: '', age_group: '', language: '', q: '', category: '', service_type: '', location: '', min_experience: '',
  pay_max: '', pay_period: '', available_day: '', skill: '', min_rating: '', identity_checked: '',
}

export function cleanFilters(values) {
  const filters = Object.fromEntries(Object.keys(EMPTY_FILTERS).map(key => [key, typeof values?.[key] === 'string' ? values[key] : '']))
  const replacements = { parent_work_support: 'occasional_backup', parent_cooking_support: 'occasional_backup', part_time: 'occasional_backup', emergency_short_notice: 'occasional_backup', overnight_sleep_training: 'overnight', evening: 'occasional_backup', event: 'occasional_backup' }
  filters.service_type = replacements[filters.service_type] || filters.service_type
  if (filters.category === 'overnight_sleep_training') { filters.category = 'newborn_maternity_nanny'; if (!filters.service_type) filters.service_type = 'overnight' }
  if (['Childcare while parents work', 'Childcare while parents cook'].includes(filters.skill)) filters.skill = ''
  return filters
}

export function searchParams(filters, page = 1, rotation = '') {
  const values = cleanFilters(filters)
  if (values.service_type !== 'live_out') values.location = ''
  if (values.pay_max && !values.pay_period) values.pay_period = 'monthly'
  const params = new URLSearchParams(Object.entries(values).filter(([, value]) => value !== ''))
  params.set('page', String(page))
  if (rotation) params.set('rotation', rotation)
  return params
}

export function readSearch(userId) {
  if (!optionalStorageAllowed()) return { filters: { ...EMPTY_FILTERS }, page: 1, rotation: '' }
  try {
    const value = JSON.parse(sessionStorage.getItem(`mlezi-search-${userId || 'public'}`) || '{}')
    // Old search tokens expire after an hour; restart page/order if stale.
    const recent = typeof value.savedAt === 'number' && Date.now() - value.savedAt < 55 * 60 * 1000
    return { filters: cleanFilters(value.filters), page: recent && Number.isInteger(value.page) && value.page > 0 ? value.page : 1,
      rotation: recent && typeof value.rotation === 'string' ? value.rotation : '' }
  } catch { return { filters: { ...EMPTY_FILTERS }, page: 1, rotation: '' } }
}

export function writeSearch(userId, state) {
  if (!optionalStorageAllowed()) return
  try { sessionStorage.setItem(`mlezi-search-${userId || 'public'}`, JSON.stringify({ ...state, savedAt: Date.now() })) }
  catch { /* Storage availability must not prevent browsing. */ }
}
