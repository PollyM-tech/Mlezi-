// Operator-only, one atomic import. Never exposed as public functions.
import { internalMutation, internalQuery } from './_generated/server.js'
import { v } from 'convex/values'
import { fail, aggregate } from './lib/marketplace.js'
import { normalizeEmail } from './lib/authPolicy.js'
const KEY = 'flask-marketplace-v1'
export const uploadUrl = internalMutation({ args: {}, handler: ctx => ctx.storage.generateUploadUrl() })
export const status = internalQuery({ args: {}, handler: async ctx => {
  const marker = await ctx.db.query('migrationState').withIndex('by_key', q => q.eq('key', KEY)).unique()
  const counts = {}
  for (const table of ['accounts', 'caregivers', 'employers', 'shortlists', 'contactUnlocks', 'reviews', 'verificationSubmissions', 'reports', 'payments']) counts[table] = (await ctx.db.query(table).collect()).length
  return { completed: !!marker, counts, importedCounts: marker?.counts || null }
} })
export const importSnapshot = internalMutation({ args: { tables: v.any(), assets: v.array(v.object({ table: v.string(), id: v.number(), field: v.string(), storageId: v.id('_storage') })) }, handler: async (ctx, { tables: t, assets }) => {
  const done = await ctx.db.query('migrationState').withIndex('by_key', q => q.eq('key', KEY)).unique()
  if (done) return { alreadyImported: true, counts: done.counts }
  for (const table of ['caregivers', 'shortlists', 'contactUnlocks', 'reviews', 'verificationSubmissions', 'reports', 'payments']) if (await ctx.db.query(table).first()) fail('Resolve existing Convex marketplace data before importing')
  const compact = obj => Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== null && value !== undefined))
  const accountMap = new Map(), caregiverMap = new Map(), employerMap = new Map()
  const asset = (table, id, field) => {
    const found = assets.find(a => a.table === table && a.id === id && a.field === field)
    if (!found) fail(`Missing migrated ${field} image`)
    return { provider: 'convex', storageId: found.storageId }
  }
  for (const a of assets) if (!await ctx.db.system.get(a.storageId)) fail('A migrated image is missing from storage')
  for (const r of t.user) {
    const email = normalizeEmail(r.email)
    let a = await ctx.db.query('accounts').withIndex('by_legacy_id', q => q.eq('legacyId', r.id)).unique()
    if (!a) a = await ctx.db.query('accounts').withIndex('by_email', q => q.eq('email', email)).unique()
    if (a && (a.email !== email || a.role !== r.role || a.legacyId !== r.id)) fail('Resolve the account mapping conflict before migrating')
    const id = a?._id || await ctx.db.insert('accounts', compact({ legacyId: r.id, role: r.role, email, phone: r.phone, createdAt: r.created_at }))
    // Auth bindings and roles are preserved; imported contact details match Flask.
    await ctx.db.patch(id, { phone: r.phone || undefined })
    accountMap.set(r.id, id)
  }
  for (const r of t.employer_profile) {
    const accountId = accountMap.get(r.user_id)
    if (!accountId) fail('Employer account mapping is missing')
    const old = await ctx.db.query('employers').withIndex('by_account', q => q.eq('accountId', accountId)).unique()
    const fields = compact({ legacyId: r.id, accountId, name: r.name, accessExpiresAt: r.unlock_pass_expires_at })
    if (old) await ctx.db.patch(old._id, fields)
    const id = old?._id || await ctx.db.insert('employers', fields)
    if (r.name) await ctx.db.patch(accountId, { name: r.name })
    employerMap.set(r.id, id)
  }
  for (const r of t.caregiver_profile) {
    const fields = compact({ legacyId: r.id, accountId: accountMap.get(r.user_id), name: r.name, photo: asset('caregiver_profile', r.id, 'photo'), photoUrl: '', bio: r.bio,
      category: r.service_category, services: r.service_types, otherServiceDescription: r.other_service_description, location: r.location, yearsExperience: r.years_experience,
      payMin: r.expected_pay_min, payMax: r.expected_pay_max, payPeriod: r.pay_period, availableDays: r.availability || [], skills: r.skills || [], ageGroups: r.age_groups || [], languages: r.languages || [], isAvailable: r.is_available,
      travelScope: r.travel_scope, travelNotes: r.travel_notes, identityStatus: r.verification_status, premiumExpiresAt: r.premium_expires_at, ratingAverage: 0, reviewCount: 0, createdAt: r.created_at, updatedAt: r.updated_at })
    const id = await ctx.db.insert('caregivers', fields)
    await ctx.db.insert('caregiverDocuments', { caregiverId: id, nationalId: asset('caregiver_profile', r.id, 'national_id') })
    caregiverMap.set(r.id, id)
  }
  for (const r of t.contact_unlock) await ctx.db.insert('contactUnlocks', { legacyId: r.id, employerId: employerMap.get(r.employer_id), caregiverId: caregiverMap.get(r.caregiver_id), unlockedAt: r.unlocked_at })
  for (const r of t.shortlist) await ctx.db.insert('shortlists', { legacyId: r.id, employerId: employerMap.get(r.employer_id), caregiverId: caregiverMap.get(r.caregiver_id), createdAt: r.created_at })
  const caregiverForUser = userId => caregiverMap.get(t.caregiver_profile.find(p => p.user_id === userId)?.id)
  for (const r of t.review) await ctx.db.insert('reviews', compact({ legacyId: r.id, employerAccountId: accountMap.get(r.from_user_id), caregiverId: caregiverForUser(r.to_user_id), authorName: r.author_name, rating: r.rating, comment: r.comment, isPublic: r.is_public, reply: r.reply, createdAt: r.created_at, updatedAt: r.updated_at || r.created_at }))
  for (const id of caregiverMap.values()) await aggregate(ctx, id)
  for (const r of t.verification_submission) {
    const photoProfile = t.caregiver_profile.find(p => p.id === r.caregiver_id)
    await ctx.db.insert('verificationSubmissions', compact({ legacyId: r.id, caregiverId: caregiverMap.get(r.caregiver_id),
      selfie: r.selfie_public_id ? asset('verification_submission', r.id, 'selfie') : undefined,
      legacyGoodConduct: r.good_conduct_public_id ? asset('verification_submission', r.id, 'legacyGoodConduct') : undefined,
      profileName: r.profile_name, profilePhoto: r.profile_photo_public_id === photoProfile?.photo_public_id ? asset('caregiver_profile', r.caregiver_id, 'photo') : undefined,
      status: r.status, reviewedBy: r.reviewed_by ? accountMap.get(r.reviewed_by) : undefined, rejectionReason: r.rejection_reason, submittedAt: r.submitted_at, reviewedAt: r.reviewed_at }))
  }
  for (const r of t.report) await ctx.db.insert('reports', compact({ legacyId: r.id, reporterId: accountMap.get(r.reporter_id), reportedAccountId: accountMap.get(r.reported_user_id), reason: r.reason, details: r.details, status: r.status, createdAt: r.created_at }))
  for (const r of t.payment) await ctx.db.insert('payments', compact({ legacyId: r.id, accountId: accountMap.get(r.user_id), type: r.type, planCode: r.plan_code, durationDays: r.duration_days, amount: r.amount, status: r.status, mpesaRef: r.mpesa_ref, checkoutRequestId: r.checkout_request_id, merchantRequestId: r.merchant_request_id, phone: r.phone, resultCode: r.result_code, resultDescription: r.result_description, lastCheckedAt: r.last_checked_at, createdAt: r.created_at, updatedAt: r.updated_at }))
  const counts = Object.fromEntries(Object.entries(t).map(([table, rows]) => [table, rows.length]))
  await ctx.db.insert('migrationState', { key: KEY, counts, completedAt: Date.now() })
  return { imported: true, counts }
} })
