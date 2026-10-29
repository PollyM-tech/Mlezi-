import { internalMutation } from './_generated/server.js'
import { v } from 'convex/values'
import { accountIdentity } from './lib/permissions.js'
import { consume, audit } from './lib/security.js'
export const reserveUpload = internalMutation({ args: {}, handler: async ctx => {
  const account = await accountIdentity(ctx, 'caregiver')
  await consume(ctx, `uploads-hour:${account._id}`, 20, 3600000)
  await consume(ctx, `uploads-day:${account._id}`, 60, 86400000)
  await consume(ctx, 'uploads-global-day', 1000, 86400000)
  return account._id
} })
export const documentAccess = internalMutation({ args: { submissionId: v.string(), kind: v.string() }, handler: async (ctx, args) => {
  const account = await accountIdentity(ctx, 'admin')
  await audit(ctx, account._id, `private_document_read:${args.kind}`, args.submissionId)
} })
