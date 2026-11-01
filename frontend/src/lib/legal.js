export function legalConfiguration(env = {}) {
  const missing = ['VITE_LEGAL_ENTITY', 'VITE_LEGAL_STRUCTURE', 'VITE_LEGAL_SERVICE_ADDRESS'].filter(key => !env[key]?.trim())
  return {
    entity: env.VITE_LEGAL_ENTITY?.trim() || 'Lintech Telecom',
    structure: env.VITE_LEGAL_STRUCTURE?.trim() || 'To be confirmed before launch',
    registration: env.VITE_LEGAL_REGISTRATION_NUMBER?.trim() || '',
    address: env.VITE_LEGAL_SERVICE_ADDRESS?.trim() || 'Service address to be confirmed before launch',
    reviewed: env.VITE_LEGAL_REVIEWED === 'true' && missing.length === 0,
    missing,
  }
}
