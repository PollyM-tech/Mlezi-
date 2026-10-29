export const CONSENT_COOKIE = 'mlezi-cookie-consent'
const COOKIE_VERSION = 'v1'
const MAX_AGE = 180 * 24 * 60 * 60
let deniedForThisPage = false

function readCookieChoice() {
  try {
    const entries = document.cookie.split(';').map(item => item.trim()).filter(item => item.startsWith(`${CONSENT_COOKIE}=`))
    // Conflicting path/domain cookies must never silently opt a visitor in.
    if (entries.length !== 1) return 'unknown'
    const value = entries[0].slice(CONSENT_COOKIE.length + 1)
    if (value === `${COOKIE_VERSION}.accepted`) return 'accepted'
    if (value === `${COOKIE_VERSION}.declined`) return 'declined'
  } catch { /* Blocked cookies default to no optional storage. */ }
  return 'unknown'
}

export function getConsent() {
  return deniedForThisPage ? 'declined' : readCookieChoice()
}

export function optionalStorageAllowed() {
  return getConsent() === 'accepted'
}

export function clearOptionalStorage() {
  try {
    for (let index = sessionStorage.length - 1; index >= 0; index--) {
      const key = sessionStorage.key(index)
      if (key?.startsWith('mlezi-search-')) sessionStorage.removeItem(key)
    }
  } catch { /* Blocked browser storage should not block the application. */ }
}

export function saveConsent(choice) {
  if (!['accepted', 'declined'].includes(choice)) throw new Error('Choose accepted or declined')
  if (choice === 'declined') clearOptionalStorage()
  try {
    const secure = window.location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `${CONSENT_COOKIE}=${COOKIE_VERSION}.${choice}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax${secure}`
  } catch { /* The banner explains if the browser cannot remember this choice. */ }
  const persisted = readCookieChoice() === choice
  // Revocation must stop optional use immediately even if a browser refuses
  // to overwrite a previously accepted cookie.
  deniedForThisPage = !persisted
  window.dispatchEvent(new Event('mlezi-consent-changed'))
  return persisted
}
