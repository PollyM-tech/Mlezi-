export const CATEGORIES = {
  nanny: 'Nanny',
  babysitter: 'Babysitter',
  travel_nanny: 'Travel nanny',
  occasional_babysitter: 'On-call / occasional babysitter',
  breastfeeding_support: 'Breastfeeding support',
  overnight_sleep_training: 'Overnight sleep training',
  special_needs_nanny: 'Special needs nanny',
  newborn_maternity_nanny: 'Newborn & maternity / night nanny',
  early_years_educator: 'Early-years educator',
  other: 'Other caregiver',
}
export const CATEGORY_DESCRIPTIONS = {
  travel_nanny: 'Provides childcare while travelling with the family.',
  occasional_babysitter: 'Provides on-call or occasional care when a family needs extra help.',
  breastfeeding_support: 'Supports families with breastfeeding.',
  overnight_sleep_training: 'Provides overnight care and support with infant sleep routines.',
  special_needs_nanny: 'Provides care tailored to children with additional support needs.',
  newborn_maternity_nanny: 'Specializes in newborn and infant care, overnight support, and support during postpartum recovery.',
}
export const SERVICE_TYPES = {
  live_in: 'Live-in', live_out: 'Live-out / day nanny (daybags)', part_time: 'Part-time',
  occasional_backup: 'On-call / occasional babysitting', emergency_short_notice: 'Short notice',
  travel: 'Travel nanny', overnight: 'Overnight / night care', weekend_holiday: 'Weekends / holidays',
  breastfeeding_support: 'Breastfeeding support', overnight_sleep_training: 'Overnight sleep training',
  special_needs_care: 'Special needs care', newborn_maternity_care: 'Newborn & maternity care',
  evening: 'Evenings', event: 'Events', other: 'Other',
}
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const SKILLS = ['Infant care', 'Newborn care', 'Breastfeeding support', 'Sleep routines', 'Postpartum support', 'Special needs care', 'First aid', 'Meal preparation', 'Homework support', 'Potty training', 'Early learning', 'Special dietary needs', 'Creative play']
export const money = value => new Intl.NumberFormat('en-KE').format(value)
