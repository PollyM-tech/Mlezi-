import { internalMutation, internalQuery, httpAction } from './_generated/server.js'
import { internal } from './_generated/api.js'
import { v } from 'convex/values'
import { trustedWebOrigins } from './lib/webOrigins.js'
import { requireAccount, accountIdentity } from './lib/permissions.js'
import { fail, find } from './lib/marketplace.js'

export const uploadAccount = internalQuery({ args: {}, handler: ctx => accountIdentity(ctx, 'caregiver') })
export const recordUpload = internalMutation({ args: { accountId: v.id('accounts'), storageId: v.id('_storage'), purpose: v.union(v.literal('photo'), v.literal('national_id'), v.literal('selfie')) }, handler: async (ctx, args) => {
  const id = await ctx.db.insert('uploadedAssets', { ...args, claimed: false, createdAt: Date.now() })
  await ctx.scheduler.runAfter(3600000, internal.files.expireUpload, { id })
} })
export const expireUpload = internalMutation({ args: { id: v.id('uploadedAssets') }, handler: async (ctx, { id }) => {
  const record = await ctx.db.get(id)
  if (record && !record.claimed) { await ctx.storage.delete(record.storageId); await ctx.db.delete(id) }
} })
export const evidence = internalQuery({ args: { submissionId: v.string(), kind: v.string() }, handler: async (ctx, { submissionId, kind }) => {
  await requireAccount(ctx, 'admin')
  const s = await find(ctx, 'verificationSubmissions', submissionId)
  let asset
  if (kind === 'selfie') asset = s.selfie
  else if (kind === 'national_id') asset = (await ctx.db.query('caregiverDocuments').withIndex('by_caregiver', q => q.eq('caregiverId', s.caregiverId)).unique())?.nationalId
  else fail('Document not found', 404)
  if (!asset || asset.provider !== 'convex') fail('This document needs to be migrated before review', 409)
  return asset.storageId
} })
function cors(request) {
  const origin = request.headers.get('Origin')
  return { ...(trustedWebOrigins(process.env.SITE_URL, process.env.APP_ALLOWED_ORIGINS).has(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}), 'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Upload-Purpose', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' }
}
export const options = httpAction(async (_ctx, request) => new Response(null, { status: 204, headers: cors(request) }))
function errorResponse(error, headers) {
  const data = error?.data
  return Response.json({ error: typeof data === 'string' ? data : data?.message || 'Unable to access this file. Sign in and try again.' }, { status: data?.status || 403, headers })
}
function validImage(bytes, type) {
  if (type === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
  if (type === 'image/png') return [137,80,78,71,13,10,26,10].every((v, i) => bytes[i] === v)
  if (type === 'image/webp') return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  return false
}
export const upload = httpAction(async (ctx, request) => {
  const headers = cors(request)
  let storageId
  try {
    const accountId = await ctx.runMutation(internal.security.reserveUpload, {})
    const purpose = request.headers.get('X-Upload-Purpose'), type = request.headers.get('Content-Type')
    if (!['photo', 'national_id', 'selfie'].includes(purpose)) fail('Select a valid upload purpose')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) fail('Upload a JPEG, PNG or WebP image')
    const max = 5 * 1024 * 1024
    if (Number(request.headers.get('Content-Length')) > max) fail('Images must be at most 5 MB')
    // Bound streamed bytes too; Content-Length is optional and untrusted.
    const reader = request.body?.getReader(); if (!reader) fail('Upload an image')
    const chunks = []; let size = 0
    for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > max) { await reader.cancel(); fail('Images must be at most 5 MB') }; chunks.push(value) }
    const blob = new Blob(chunks, { type })
    if (!size || !validImage(new Uint8Array(await blob.slice(0, 12).arrayBuffer()), type)) fail('The file is not a valid JPEG, PNG or WebP image')
    const sanitized = await ctx.runAction(internal.imageProcessing.sanitize, { bytes: await blob.arrayBuffer(), type })
    storageId = await ctx.storage.store(new Blob([sanitized], { type: 'image/jpeg' }))
    await ctx.runMutation(internal.files.recordUpload, { accountId, storageId, purpose })
    return Response.json({ storageId }, { headers })
  } catch (error) { if (storageId) await ctx.storage.delete(storageId); return errorResponse(error, headers) }
})
export const document = httpAction(async (ctx, request) => {
  const headers = cors(request)
  try {
    const url = new URL(request.url)
    const id = await ctx.runQuery(internal.files.evidence, { submissionId: url.searchParams.get('submissionId') || '', kind: url.searchParams.get('kind') || '' })
    const blob = await ctx.storage.get(id)
    if (!blob) fail('Document not found', 404)
    await ctx.runMutation(internal.security.documentAccess, { submissionId: url.searchParams.get('submissionId') || '', kind: url.searchParams.get('kind') || '' })
    return new Response(blob, { headers: { ...headers, 'Content-Type': blob.type, 'Content-Disposition': 'inline' } })
  } catch (error) { return errorResponse(error, headers) }
})
