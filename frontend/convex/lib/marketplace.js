import { ConvexError } from 'convex/values'
import { requireAccount } from './permissions.js'

export const DAY = 86400000
export const active = expiry => typeof expiry === 'number' && expiry > Date.now()
export const iso = time => typeof time === 'number' ? new Date(time).toISOString() : null
export function fail(message, status = 400) { throw new ConvexError({ message, status }) }
export function text(value, label, max, required = false) {
  if (typeof value !== 'string' || value.length > max || required && !value.trim()) fail(`Enter ${label}, at most ${max} characters`)
  return value.trim()
}
export const CATEGORIES = ['nanny', 'babysitter', 'travel_nanny', 'occasional_babysitter', 'breastfeeding_support', 'special_needs_nanny', 'newborn_maternity_nanny', 'early_years_educator', 'other']
export const SERVICES = ['live_in', 'live_out', 'occasional_backup', 'travel', 'overnight', 'weekend_holiday', 'breastfeeding_support', 'special_needs_care', 'newborn_maternity_care', 'other']
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const AGES = ['infants', 'toddlers', 'preschool', 'school_age']
export const SCOPES = ['local', 'international', 'both']
export const PLANS = {
  employer_30_days: { role: 'employer', amount: 300, days: 30, type: 'unlock_pass' },
  employer_90_days: { role: 'employer', amount: 500, days: 90, type: 'unlock_pass' },
  caregiver_365_days: { role: 'caregiver', amount: 500, days: 365, type: 'caregiver_premium' },
}
export const externalId = row => row.legacyId ?? row._id
export async function find(ctx, table, id) {
  let row = null
  if (/^[0-9]+$/.test(String(id))) row = await ctx.db.query(table).withIndex('by_legacy_id', q => q.eq('legacyId', Number(id))).unique()
  else { const normalized = ctx.db.normalizeId(table, String(id)); if (normalized) row = await ctx.db.get(normalized) }
  if (!row) fail('Record not found', 404)
  return row
}
export async function owned(ctx, table, ...roles) {
  const account = await requireAccount(ctx, ...roles)
  const profile = await ctx.db.query(table).withIndex('by_account', q => q.eq('accountId', account._id)).unique()
  if (!profile) fail('Create your profile to get started', 404)
  return { account, profile }
}
export async function publicProfile(ctx, p, account) {
  const result = { id: externalId(p), name: p.name, photo_url: p.photo.provider === 'convex' ? await ctx.storage.getUrl(p.photo.storageId) : p.photoUrl,
    bio: p.bio || null, service_category: p.category, service_types: p.services, other_service_description: p.otherServiceDescription || null,
    location: p.location || null, years_experience: p.yearsExperience, expected_pay_min: p.payMin ?? null, expected_pay_max: p.payMax ?? null,
    pay_period: p.payPeriod, availability: p.availableDays, skills: p.skills, age_groups: p.ageGroups, languages: p.languages,
    is_available: p.isAvailable, travel_scope: p.travelScope || null, travel_notes: p.travelNotes || null,
    verification_status: p.identityStatus, adult_confirmed: p.identityStatus === 'verified' && typeof p.adultConfirmedAt === 'number', premium_active: active(p.premiumExpiresAt), rating_avg: p.ratingAverage, review_count: p.reviewCount }
  if (account) {
    result.phone = account.phone || null; result.premium_expires_at = iso(p.premiumExpiresAt)
    const documents = await ctx.db.query('caregiverDocuments').withIndex('by_caregiver', q => q.eq('caregiverId', p._id)).unique()
    result.national_id_uploaded = !!documents?.nationalId && (documents.nationalId.provider !== 'convex' || !!await ctx.db.system.get(documents.nationalId.storageId))
  }
  return result
}
export function employerProfile(p, account) {
  return { name: p.name || account.name || '', email: account.email, phone: account.phone || '', pass_active: active(p.accessExpiresAt), pass_expires_at: iso(p.accessExpiresAt) }
}
export function reviewData(r) { return { id: externalId(r), rating: r.rating, comment: r.comment || '', author_name: r.authorName || 'Employer', reply: r.reply || null, created_at: iso(r.createdAt) } }
export function verificationData(s) { return s ? { id: externalId(s), status: s.status, submitted_at: iso(s.submittedAt), reviewed_at: iso(s.reviewedAt), rejection_reason: s.rejectionReason || null } : null }
export function paymentData(p) { return { id: externalId(p), type: p.type, plan_code: p.planCode || null, amount: p.amount, status: p.status, provider: p.provider || null, receipt: p.provider === 'manual_mpesa' ? p.mpesaRef || null : null, phone: p.provider === 'manual_mpesa' ? p.phone || null : null, reviewed_at: iso(p.reviewedAt), result_description: p.resultDescription || null, created_at: iso(p.createdAt) } }
export async function aggregate(ctx, caregiverId) {
  const reviews = await ctx.db.query('reviews').withIndex('by_caregiver_public', q => q.eq('caregiverId', caregiverId).eq('isPublic', true)).collect()
  await ctx.db.patch(caregiverId, { ratingAverage: reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0, reviewCount: reviews.length })
}
function list(value, label, allowed) {
  if (typeof value === 'string') { try { value = JSON.parse(value) } catch { fail(`${label} must be a list`) } }
  if (!Array.isArray(value) || value.length > 30 || value.some(v => typeof v !== 'string' || !v.trim() || v.trim().length > 80 || allowed && !allowed.includes(v.trim()))) fail(`Select valid ${label}`)
  return [...new Set(value.map(v => v.trim()))]
}
export function profileFields(data, old) {
  const read = (key, previous, fallback) => data[key] ?? old?.[previous] ?? fallback
  const fields = {
    name: text(read('name', 'name', ''), 'your name', 120, true),
    bio: text(read('bio', 'bio', ''), 'a bio', 3000), location: text(read('location', 'location', ''), 'a location', 120),
    otherServiceDescription: text(read('other_service_description', 'otherServiceDescription', ''), 'a service description', 1000),
    category: read('service_category', 'category', ''), services: list(read('service_types', 'services', []), 'services', SERVICES),
    payPeriod: read('pay_period', 'payPeriod', 'monthly'),
    availableDays: list(read('availability', 'availableDays', []), 'weekdays', DAYS), skills: list(read('skills', 'skills', []), 'skills'),
    ageGroups: list(read('age_groups', 'ageGroups', []), 'age groups', AGES), languages: list(read('languages', 'languages', []), 'languages'),
    travelNotes: text(read('travel_notes', 'travelNotes', ''), 'travel notes', 1000),
  }
  if (!CATEGORIES.includes(fields.category) || !fields.services.length || !['monthly', 'daily', 'hourly'].includes(fields.payPeriod)) fail('Select a valid category, work arrangement and pay period')
  if (fields.category === 'travel_nanny' && !fields.services.includes('travel')) fields.services.push('travel')
  if ((fields.category === 'other' || fields.services.includes('other')) && !fields.otherServiceDescription) fail('Please describe the other caregiver service you provide')
  if (fields.services.includes('live_out') && !fields.location) fail('Location is required for live-out services')
  for (const [key, column, max] of [['years_experience', 'yearsExperience', 80], ['expected_pay_min', 'payMin', 2147483647], ['expected_pay_max', 'payMax', 2147483647]]) {
    const raw = read(key, column, column === 'yearsExperience' ? 0 : '')
    const n = Number(raw)
    if (raw === '' && column !== 'yearsExperience') fields[column] = undefined
    else { if (!Number.isInteger(n) || n < 0 || n > max) fail(`Enter a valid ${key.replaceAll('_', ' ')}`); fields[column] = n }
  }
  if (fields.payMin !== undefined && fields.payMax !== undefined && fields.payMin > fields.payMax) fail('Minimum expected pay cannot exceed maximum expected pay')
  let available = read('is_available', 'isAvailable', true)
  if (available === 'true') available = true
  if (available === 'false') available = false
  if (typeof available !== 'boolean') fail('Availability status must be true or false')
  fields.isAvailable = available
  const scope = read('travel_scope', 'travelScope', '')
  if (scope && !SCOPES.includes(scope)) fail('Select a valid travel scope')
  fields.travelScope = scope || undefined
  return fields
}
export function phone(value) {
  if (typeof value !== 'string' || !/^\+?[0-9][0-9 ()-]{6,30}$/.test(value.trim())) fail('Enter a valid contact phone number')
  return value.trim()
}

export function confirmAdult(birthDate, now = Date.now()) {
  if (typeof birthDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) fail('Enter the complete date of birth shown on the ID before approving')
  const parsed = new Date(`${birthDate}T00:00:00Z`)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== birthDate) fail('The ID date of birth is invalid')
  // The adult threshold is evaluated against today's Kenyan calendar date.
  const today = new Date(now + 3 * 3600000).toISOString().slice(0,10)
  const age = Number(today.slice(0,4)) - Number(birthDate.slice(0,4)) - (today.slice(5) < birthDate.slice(5) ? 1 : 0)
  if (age < 18 || age > 120) fail('Approval requires an applicant aged 18 or older. Reject underage or uncertain identity evidence.')
}

export const approvedAdult = profile => profile?.identityStatus === 'verified' && typeof profile.adultConfirmedAt === 'number'
