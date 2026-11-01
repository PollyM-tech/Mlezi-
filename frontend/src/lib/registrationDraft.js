const KEY = 'mlezi-registration-draft'
const TTL = 30 * 60 * 1000
export function saveRegistrationDraft(details) {
  const value = JSON.stringify({ ...details, expiresAt: Date.now() + TTL })
  try { sessionStorage.setItem(KEY, value) } catch { /* Completion still offers editable fields. */ }
  try { localStorage.setItem(KEY, value) } catch { /* Cross-tab handoff is optional. */ }
}
export function readRegistrationDraft(email) {
  for (const name of ['sessionStorage', 'localStorage']) {
    try {
      const storage = window[name]
      const draft = JSON.parse(storage.getItem(KEY) || 'null')
      if (!draft) continue
      if (!draft.expiresAt || draft.expiresAt <= Date.now()) { storage.removeItem(KEY); continue }
      // A cross-tab draft is used only for the email verified by the backend.
      if (!email || draft.email !== email) continue
      return draft
    } catch { /* Ignore unavailable storage and malformed drafts. */ }
  }
  return {}
}
export function clearRegistrationDraft(email) {
  for (const name of ['sessionStorage', 'localStorage']) {
    try {
      const storage = window[name]
      const draft = JSON.parse(storage.getItem(KEY) || 'null')
      if (!email || draft?.email === email) storage.removeItem(KEY)
    } catch { /* Never block signup/sign-out on draft cleanup. */ }
  }
}
