export const profile = {
  id: "sample1",
  name: "Example Caregiver With A Longer Profile Name",
  phone: "+254700000000",
  photo_url: "/src/assets/logo.png",
  bio: "Experienced caregiver offering warm, reliable childcare and travel support. ".repeat(
    4,
  ),
  service_category: "travel_nanny",
  service_types: ["travel", "live_out", "newborn_maternity_care"],
  other_service_description: "",
  location: "Nairobi and surrounding neighbourhoods",
  years_experience: 5,
  expected_pay_min: 15000,
  expected_pay_max: 25000,
  pay_period: "monthly",
  availability: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  skills: ["First aid", "Newborn care", "Travel childcare", "Meal preparation"],
  age_groups: ["infants", "toddlers", "preschool"],
  languages: ["English", "Kiswahili", "Kirundi"],
  travel_scope: "both",
  travel_notes:
    "Available for family trips within Kenya and internationally. Agree working hours and accommodation.",
  is_available: true,
  verification_status: "verified",
  adult_confirmed: true,
  national_id_uploaded: true,
  premium_active: true,
  rating_avg: 4.8,
  review_count: 1,
};
export const parent = {
  id: "parent",
  role: "employer",
  email: "sample.parent.with.a.long.address@example.test",
  phone: "+254700000000",
  name: "Example Parent With A Longer Name",
  pass_active: false,
};
export const plans = [
  { code: "employer_30", role: "employer", amount: 300, days: 30 },
  { code: "employer_90", role: "employer", amount: 500, days: 90 },
  { code: "caregiver_365", role: "caregiver", amount: 500, days: 365 },
];
export const tickets = {
  tickets: [
    {
      id: "ticket1",
      subject:
        "Example support issue with a longer subject for responsive testing",
      status: "open",
      createdAt: 0,
      followUpDueAt: 172800000,
    },
  ],
  cursor: null,
};
export const thread = {
  id: "ticket1",
  subject: "Example support conversation",
  status: "open",
  messages: [
    {
      id: "message1",
      sender: "customer",
      body: "Example message. ".repeat(30),
      createdAt: 0,
    },
  ],
  emails: [],
};
