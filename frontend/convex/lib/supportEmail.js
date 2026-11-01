export function supportEmailConfig() {
  return { key: process.env.SUPPORT_RESEND_KEY || process.env.AUTH_RESEND_KEY, from: process.env.SUPPORT_EMAIL_FROM || process.env.AUTH_EMAIL_FROM, inbox: process.env.SUPPORT_INBOX_EMAIL }
}
export function supportEmailReady() { const c = supportEmailConfig(); return !!c.key && !!c.from }
export function supportEmailProductionReady() {
  const c = supportEmailConfig()
  return supportEmailReady() && !c.from.includes('@resend.dev') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.inbox || '')
}
