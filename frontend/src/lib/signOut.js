import { createContext, useContext } from 'react'

export const AUTH_STORAGE_NAMESPACE = 'mlezi-convex-auth'
export const SignOutContext = createContext(null)
export function useSignOut() { return useContext(SignOutContext) }

// Each mounted provider owns an adapter. A retired provider's delayed token
// refresh/sign-out cannot write over credentials from a subsequent sign-in.
export function createAuthStorage(storage = window.sessionStorage) {
  let retired = false
  const suffix = `_${AUTH_STORAGE_NAMESPACE.replace(/[^a-zA-Z0-9]/g, '')}`
  return {
    getItem(key) { return retired ? null : storage.getItem(key) },
    setItem(key, value) { if (!retired) storage.setItem(key, value) },
    removeItem(key) { if (!retired) storage.removeItem(key) },
    retire() {
      retired = true
      for (const key of Object.keys(storage)) {
        if (key.startsWith('__convexAuth') && key.endsWith(suffix) || key === 'mlezi-registration-draft') storage.removeItem(key)
      }
    },
  }
}

export function beginSignOut({ revoke, storage, detach, clearSession, goHome, dispose }) {
  // Start revocation while the authenticated connection is still available.
  let pending
  try { pending = Promise.resolve(revoke()) } catch { pending = Promise.resolve() }
  storage.retire()
  clearSession()
  detach()
  goHome()
  // Revocation is best effort when offline; the local session is already gone.
  let disposed = false
  const finish = () => { if (!disposed) { disposed = true; clearTimeout(timer); Promise.resolve().then(dispose).catch(() => {}) } }
  const timer = setTimeout(finish, 10000)
  pending.catch(() => {}).finally(finish)
}
