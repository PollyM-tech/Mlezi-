// Keyword equivalence affects matching only. It never grants a skill, identity
// approval or paid placement, and never infers nationality from a language.
export function normalizeSearch(value) {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[_/–—-]+/g, ' ')
    .replace(/\bhouse\s+helps?\b/g, 'househelp')
    .replace(/\bdomestic\s+workers?\b/g, 'househelp')
    .replace(/\b(maids?|househelps?)\b/g, 'househelp')
    .replace(/\bnannies\b/g, 'nanny').replace(/\bbabysitters\b/g, 'babysitter')
    .replace(/\bswahili\b/g, 'kiswahili').replace(/\bfrancais\b/g, 'french')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
}

export function matchesKeywords(profile, query) {
  const tokens = normalizeSearch(query).split(' ').filter(Boolean)
  if (!tokens.length) return true
  const category = profile.category === 'occasional_babysitter' ? 'occasional babysitter on call' : profile.category
  const content = normalizeSearch([
    profile.name, profile.bio, profile.otherServiceDescription, profile.location, category,
    ...(profile.services || []), ...(profile.languages || []), ...(profile.skills || []), ...(profile.ageGroups || []),
  ].join(' '))
  const words = content.split(' ')
  // Whole terms avoid "maid" matching unrelated substrings; a prefix supports
  // natural partial names and towns without weakening explicit form filters.
  return tokens.every(token => words.some(word => word === token || token.length >= 3 && word.startsWith(token)))
}
