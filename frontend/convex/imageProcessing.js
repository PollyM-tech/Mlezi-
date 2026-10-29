'use node'
import sharp from 'sharp'
import { internalAction } from './_generated/server.js'
import { v, ConvexError } from 'convex/values'

export async function sanitizeImage(bytes, type) {
  try {
    if (bytes.byteLength > 5 * 1024 * 1024) throw new Error('size')
    const image = sharp(Buffer.from(bytes), { limitInputPixels: 20000000, failOn: 'warning', animated: false })
    const metadata = await image.metadata()
    const formats = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' }
    if (!formats[type] || metadata.format !== formats[type] || !metadata.width || !metadata.height || Math.max(metadata.width, metadata.height) > 8000 || (metadata.pages || 1) > 1) throw new Error('format')
    // Full decode and fresh JPEG encoding; Sharp strips EXIF/GPS/other metadata
    // unless keepMetadata/withMetadata is explicitly requested (never here).
    const output = await image.rotate().resize({ width: 3200, height: 3200, fit: 'inside', withoutEnlargement: true }).flatten({ background: '#ffffff' }).jpeg({ quality: 90 }).timeout({ seconds: 8 }).toBuffer()
    if (output.length > 5 * 1024 * 1024) throw new Error('size')
    return output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength)
  } catch { throw new ConvexError({ message: 'Upload a complete JPEG, PNG or WebP image, at most 5 MB and 20 megapixels, with each dimension at most 8000 pixels.', status: 400 }) }
}
export const sanitize = internalAction({ args: { bytes: v.bytes(), type: v.string() }, handler: (_ctx, { bytes, type }) => sanitizeImage(bytes, type) })

export const checkRuntime = internalAction({ args: {}, handler: async () => {
  const input = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#ffffff' } }).png().toBuffer()
  const output = await sanitizeImage(input, 'image/png')
  const meta = await sharp(Buffer.from(output)).metadata()
  return { imageDecoderReady: meta.format === 'jpeg' && meta.width === 4 && !meta.exif }
} })
