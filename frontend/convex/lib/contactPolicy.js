import { ConvexError } from 'convex/values'

function normalized(value) {
  return value.normalize('NFKC').replace(/[\u200b-\u200f\u2060\ufeff]/g, '')
    .replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 0x6f0))
}
export function containsContact(value) {
  if (Array.isArray(value)) return value.some(containsContact) || containsContact(value.filter(v => typeof v === 'string').join(' '))
  if (typeof value !== 'string') return false
  const s = normalized(value)
  if (/[\w.+-]+\s*(?:@|\[at\]|\(at\)|\s+at\s+)\s*[\w.-]+\s*(?:\.|\[dot\]|\(dot\)|\s+dot\s+)\s*[a-z]{2,}/i.test(s)) return true
  if (/(?:https?:\/\/|www\.|mailto:|tel:|wa\.me\b|t\.me\b|whatsapp|telegram|instagram|facebook|snapchat|tiktok|signal\.me|@[a-z0-9_])/i.test(s)) return true
  // Catch phone numbers separated by spaces, punctuation, or common obfuscation.
  if (/(?:\d[\s().+_\-/]*){9,}/.test(s)) return true
  const words=s.toLowerCase().replace(/\b(?:zero|oh|one|two|three|four|five|six|seven|eight|nine)\b/g, w => String(['zero','one','two','three','four','five','six','seven','eight','nine'].indexOf(w === 'oh' ? 'zero' : w)))
  if (/(?:\d[\s,.-]*){9,}/.test(words)) return true
  // Domains also allow contact exchange without an explicit URL scheme.
  return /\b[a-z0-9][a-z0-9-]*\.(?:com|org|net|io|me|co\.ke|co\.ug|co\.tz|rw|bi|ke|ug|tz)\b/i.test(s)
}
export function assertNoContact(values) {
  if (values.some(containsContact)) throw new ConvexError({message:'Remove phone numbers, email addresses, social handles and contact links from public text. Use the private contact fields; contacts are shared through paid contact access.',status:400})
}
export function safePublicText(value) {
  if (Array.isArray(value)) return containsContact(value) ? ['[Contact details removed]'] : value.map(safePublicText)
  return containsContact(value) ? '[Contact details removed]' : value
}
export const PROFILE_TEXT_FIELDS=['name','bio','otherServiceDescription','location','skills','languages','travelNotes']
export function safeProfileText(profile) {
  return Object.fromEntries(PROFILE_TEXT_FIELDS.map(key=>[key,safePublicText(profile[key])]))
}
