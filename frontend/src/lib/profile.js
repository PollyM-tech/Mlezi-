export const CATEGORIES = {
  nanny: 'Nanny',
  babysitter: 'Babysitter',
  travel_nanny: 'Travel nanny',
  occasional_babysitter: 'On-call / occasional babysitter',
  breastfeeding_support: 'Breastfeeding support',
  special_needs_nanny: 'Special needs nanny',
  newborn_maternity_nanny: 'Newborn & maternity / night nanny',
  early_years_educator: 'Early-years educator',
  other: 'Other caregiver',
}
export const CATEGORY_DESCRIPTIONS = {
  travel_nanny: 'Accompanies families on trips and holidays to help with children during travel, outings, and parents’ work time. Agree duties, travel costs, accommodation, and working hours together.',
  occasional_babysitter: 'Provides on-call or occasional care when a family needs extra help.',
  breastfeeding_support: 'Supports families with breastfeeding.',
  special_needs_nanny: 'Provides care tailored to children with additional support needs.',
  newborn_maternity_nanny: 'Specializes in newborn and infant care, overnight support, and support during postpartum recovery.',
}
export const SERVICE_TYPES = {
  live_in: 'Live-in', live_out: 'Live-out / day nanny (daybags)',
  occasional_backup: 'On-call / occasional babysitting',
  travel: 'Travel & holiday childcare', overnight: 'Overnight / night care', weekend_holiday: 'Weekends / holidays',
  breastfeeding_support: 'Breastfeeding support',
  special_needs_care: 'Special needs care', newborn_maternity_care: 'Newborn & maternity care',
  other: 'Other',
}
export const AGE_GROUPS = { infants: 'Infants (under 1 year)', toddlers: 'Toddlers (1–3 years)', preschool: 'Preschool (3–5 years)', school_age: 'School age (6+ years)' }
export const TRAVEL_SCOPES = { local: 'Within Kenya', international: 'International travel', both: 'Within Kenya & international' }
export const LANGUAGES = ['English', 'Kiswahili', 'Kirundi', 'Kinyarwanda', 'Luganda', 'French', 'Kenyan Sign Language']
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const SKILLS = ['Infant care', 'Newborn care', 'Breastfeeding support', 'Sleep routines', 'Postpartum support', 'Special needs care', 'First aid', 'Meal preparation', 'Travel childcare', 'Homework support', 'Potty training', 'Early learning', 'Special dietary needs', 'Creative play']
export const money = value => new Intl.NumberFormat('en-KE').format(value)
