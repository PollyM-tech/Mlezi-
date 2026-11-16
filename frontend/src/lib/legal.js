export function legalConfiguration(env = {}) {
  const missing = ['VITE_LEGAL_PROPRIETOR', 'VITE_LEGAL_SERVICE_ADDRESS'].filter(key => !env[key]?.trim())
  return {
    entity: 'Mlezi',
    structure: 'Sole proprietorship',
    proprietor: env.VITE_LEGAL_PROPRIETOR?.trim() || '',
    registration: '',
    address: env.VITE_LEGAL_SERVICE_ADDRESS?.trim() || '',
    reviewed: env.VITE_LEGAL_REVIEWED === 'true' && missing.length === 0,
    missing,
  }
}
