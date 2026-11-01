export const SUPPORT_CATEGORIES = { account: 'Account or sign-in', profile: 'Caregiver profile', identity: 'Identity review', membership: 'Membership or payment', technical: 'Technical problem', safety: 'Safety concern', privacy: 'Privacy request', other: 'Other' }
export const SUPPORT_STATUSES = { open: 'Awaiting support', waiting: 'Support replied', resolved: 'Resolved' }
export const supportError = error => typeof error.data === 'string' ? error.data : error.data?.message || 'Unable to complete this request. Please try again.'
