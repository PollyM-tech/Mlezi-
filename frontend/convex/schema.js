import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { authTables } from '@convex-dev/auth/server'

const optionalText = v.optional(v.string())
const optionalNumber = v.optional(v.number())
const legacy = { legacyId: optionalNumber }
const role = v.union(v.literal('caregiver'), v.literal('employer'), v.literal('admin'))
const category = v.union(...['nanny', 'babysitter', 'travel_nanny', 'occasional_babysitter',
  'breastfeeding_support', 'special_needs_nanny', 'newborn_maternity_nanny',
  'early_years_educator', 'other'].map(value => v.literal(value)))
const service = v.union(...['live_in', 'live_out', 'occasional_backup', 'travel',
  'overnight', 'weekend_holiday', 'breastfeeding_support', 'special_needs_care',
  'newborn_maternity_care', 'other'].map(value => v.literal(value)))
const identityStatus = v.union(...['unverified', 'pending', 'verified', 'rejected'].map(value => v.literal(value)))
const privateAsset = v.union(
  v.object({ provider: v.literal('cloudinary'), publicId: v.string() }),
  v.object({ provider: v.literal('convex'), storageId: v.id('_storage') }),
)

// No application data is readable until an authorized server function exposes it.
// Public caregiver projections must exclude account contact and private evidence.
export default defineSchema({
  ...authTables,
  supportEmails: defineTable({ ticketId: v.id('supportTickets'), messageId: v.optional(v.id('supportMessages')), kind: v.union(v.literal('acknowledgement'), v.literal('reply'), v.literal('team')), status: v.union(v.literal('pending'), v.literal('sending'), v.literal('sent'), v.literal('failed')), attempts: v.number(), createdAt: v.number(), lastAttemptAt: optionalNumber, sentAt: optionalNumber }).index('by_ticket', ['ticketId']),
  supportTickets: defineTable({ accountId: v.optional(v.id('accounts')), guestKeyHash: optionalText, guestEmail: optionalText, subject: v.string(), category: v.string(), status: v.union(v.literal('open'), v.literal('waiting'), v.literal('resolved')), messageCount: v.number(), createdAt: v.number(), updatedAt: v.number() }).index('by_account', ['accountId', 'updatedAt']).index('by_status', ['status', 'updatedAt']).index('by_updated', ['updatedAt']),
  supportMessages: defineTable({ ticketId: v.id('supportTickets'), sender: v.union(v.literal('customer'), v.literal('support')), body: v.string(), createdAt: v.number() }).index('by_ticket', ['ticketId']),
  adminMfa: defineTable({ accountId: v.id('accounts'), encryptedSecret: v.string(), enabled: v.boolean(), setupExpiresAt: v.number(), attempts: v.number(), lastStep: optionalNumber }).index('by_account', ['accountId']),
  adminSessions: defineTable({ accountId: v.id('accounts'), sessionId: v.string(), expiresAt: v.number() }).index('by_session', ['sessionId']),
  rateLimits: defineTable({ key: v.string(), count: v.number(), resetAt: v.number() }).index('by_key', ['key']),
  securityAudit: defineTable({ actorId: v.optional(v.id('accounts')), targetId: optionalText, action: v.string(), createdAt: v.number() }).index('by_created', ['createdAt']),
  dataRequests: defineTable({ accountId: v.id('accounts'), type: v.union(v.literal('deletion'), v.literal('correction')), details: optionalText, status: v.union(v.literal('open'), v.literal('resolved')), createdAt: v.number() }).index('by_account', ['accountId']).index('by_status', ['status']),
  migrationState: defineTable({ key: v.string(), completedAt: v.number(), counts: v.any() }).index('by_key', ['key']),
  uploadedAssets: defineTable({ accountId: v.id('accounts'), storageId: v.id('_storage'), purpose: v.union(v.literal('photo'), v.literal('national_id'), v.literal('selfie')), claimed: v.boolean(), createdAt: v.number() }).index('by_storage', ['storageId']),
  authEmailLimits: defineTable({ email: v.string(), lastSentAt: v.number(), windowStartedAt: v.number(), count: v.number() }).index('by_email', ['email']),
  accounts: defineTable({
    ...legacy, name: optionalText, authSubject: optionalText, suspendedAt: optionalNumber, suspensionReason: optionalText, deletionRequestedAt: optionalNumber, role, email: v.string(), phone: optionalText, termsAcceptedAt: optionalNumber, termsVersion: optionalText, privacyNoticeVersion: optionalText, createdAt: v.number(),
  }).index('by_auth_subject', ['authSubject']).index('by_email', ['email']).index('by_legacy_id', ['legacyId']),
  caregivers: defineTable({
    ...legacy, accountId: v.id('accounts'), name: v.string(), photoUrl: v.string(),
    photo: privateAsset, bio: optionalText, category, services: v.array(service),
    otherServiceDescription: optionalText, location: optionalText, yearsExperience: v.number(),
    payMin: optionalNumber, payMax: optionalNumber,
    payPeriod: v.union(v.literal('monthly'), v.literal('daily'), v.literal('hourly')),
    availableDays: v.array(v.string()), skills: v.array(v.string()), ageGroups: v.array(v.string()),
    languages: v.array(v.string()), isAvailable: v.boolean(),
    travelScope: v.optional(v.union(v.literal('local'), v.literal('international'), v.literal('both'))),
    travelNotes: optionalText, identityStatus, adultConfirmedAt: optionalNumber, premiumExpiresAt: optionalNumber,
    ratingAverage: v.number(), reviewCount: v.number(), createdAt: v.number(), updatedAt: v.number(),
  }).index('by_account', ['accountId']).index('by_available_category', ['isAvailable', 'category'])
    .index('by_published_category', ['identityStatus', 'isAvailable', 'category'])
    .index('by_legacy_id', ['legacyId']),
  caregiverDocuments: defineTable({
    caregiverId: v.id('caregivers'), nationalId: privateAsset,
  }).index('by_caregiver', ['caregiverId']),
  employers: defineTable({
    ...legacy, accountId: v.id('accounts'), name: optionalText, accessExpiresAt: optionalNumber,
  }).index('by_account', ['accountId']).index('by_legacy_id', ['legacyId']),
  contactUnlocks: defineTable({
    ...legacy, employerId: v.id('employers'), caregiverId: v.id('caregivers'), unlockedAt: v.number(),
  }).index('by_pair', ['employerId', 'caregiverId']).index('by_legacy_id', ['legacyId']),
  shortlists: defineTable({
    ...legacy, employerId: v.id('employers'), caregiverId: v.id('caregivers'), createdAt: v.number(),
  }).index('by_pair', ['employerId', 'caregiverId']).index('by_legacy_id', ['legacyId']),
  reviews: defineTable({
    ...legacy, employerAccountId: v.id('accounts'), caregiverId: v.id('caregivers'),
    authorName: optionalText, rating: v.number(), comment: optionalText, isPublic: v.boolean(),
    reply: optionalText, createdAt: v.number(), updatedAt: v.number(),
  }).index('by_pair', ['employerAccountId', 'caregiverId']).index('by_caregiver_public', ['caregiverId', 'isPublic'])
    .index('by_legacy_id', ['legacyId']),
  verificationSubmissions: defineTable({
    ...legacy, caregiverId: v.id('caregivers'), selfie: v.optional(privateAsset),
    legacyGoodConduct: v.optional(privateAsset), profileName: optionalText, profilePhoto: v.optional(privateAsset),
    status: v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected')),
    reviewedBy: v.optional(v.id('accounts')), rejectionReason: optionalText,
    submittedAt: v.number(), reviewedAt: optionalNumber, adultConfirmedAt: optionalNumber,
  }).index('by_status', ['status']).index('by_caregiver', ['caregiverId']).index('by_legacy_id', ['legacyId']),
  reports: defineTable({
    ...legacy, reporterId: v.id('accounts'), reportedAccountId: v.id('accounts'),
    reason: v.string(), details: optionalText,
    status: v.union(v.literal('open'), v.literal('reviewed'), v.literal('resolved')), createdAt: v.number(),
  }).index('by_status', ['status']).index('by_legacy_id', ['legacyId']),
  // Server-priced payments. Callback claims never directly grant membership.
  payments: defineTable({
    ...legacy, accountId: v.id('accounts'),
    type: v.union(v.literal('unlock_pass'), v.literal('caregiver_premium'), v.literal('featured_boost')),
    environment: v.optional(v.union(v.literal('sandbox'), v.literal('production'))),
    initiationState: v.optional(v.union(v.literal('prepared'), v.literal('sent'), v.literal('unknown'), v.literal('rejected'))),
    provider: v.optional(v.literal('manual_mpesa')), reviewedBy: v.optional(v.id('accounts')), reviewedAt: optionalNumber,
    planCode: optionalText, durationDays: optionalNumber, amount: v.number(),
    status: v.union(v.literal('pending'), v.literal('completed'), v.literal('failed')),
    mpesaRef: optionalText, checkoutRequestId: optionalText, merchantRequestId: optionalText,
    phone: optionalText, resultCode: optionalNumber, resultDescription: optionalText,
    lastCheckedAt: optionalNumber, createdAt: v.number(), updatedAt: v.number(),
  }).index('by_account', ['accountId']).index('by_checkout', ['checkoutRequestId']).index('by_status', ['status'])
    .index('by_receipt', ['mpesaRef']).index('by_manual_status', ['provider', 'status']).index('by_legacy_id', ['legacyId']),
})
