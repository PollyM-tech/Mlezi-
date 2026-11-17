// Public planning guides; availability and duties must be agreed with each caregiver.
export const SERVICE_GUIDES = [
  {
    path: '/newborn-care/', navLabel: 'Newborn care',
    title: 'Newborn nanny care in Kenya | Planning your search | Mlezi',
    description: 'Plan your newborn nanny search in Kenya: relevant experience, parent handovers, daytime and overnight duties, interviews and paid trials.',
    heading: 'Find support for your baby’s early days.',
    intro: 'Looking for a nanny with newborn experience? Start with the support your household needs and ask each person about their experience with babies of a similar age. Mlezi connects families and caregivers directly; a profile or identity badge does not certify newborn-care skills.',
    sections: [
      ['Describe the support you need', 'Write down whether you want daytime help, agreed overnight hours or support alongside a parent. Explain which tasks involve the baby, such as preparing agreed supplies, baby laundry and keeping a routine log. Agree household work separately so the role has a realistic workload.'],
      ['Ask for specific examples of experience', 'Ask how the nanny has supported parents with a newborn, handled handovers and communicated concerns. Discuss any relevant training and check it with the issuer where possible. Speak to previous employers with permission rather than relying only on a profile description.'],
      ['Keep parents involved in the care plan', 'Explain your baby’s established routine and any instructions from your healthcare professional directly to the caregiver. Agree who to contact with questions and what to do if a parent cannot be reached. This guide does not replace medical advice or professional clinical care.'],
      ['Make overnight expectations explicit', 'Agree when work begins and ends, who is responsible during each part of the night, sleeping arrangements and protected rest. Living in the home does not mean being available at all hours. Record pay and arrangements for extra hours before care begins.'],
      ['Start with a paid, supervised handover', 'Allow time to explain supplies, household rules and communication preferences while a parent is present. Use a paid, supervised trial to assess communication and suitability before making a longer agreement.'],
    ],
  },
  {
    path: '/babysitting/', navLabel: 'Occasional babysitting',
    title: 'Babysitters in Kenya | Evening and occasional care | Mlezi',
    description: 'Plan occasional or evening babysitting in Kenya: dates, hours, introductions, transport, agreed duties and a clear parent handover.',
    heading: 'Plan occasional care with confidence.',
    intro: 'An evening out, a weekend commitment or a change in your usual routine may call for occasional babysitting. Give a potential babysitter a clear brief and time to meet your family. Availability depends on the people actually listed on Mlezi.',
    sections: [
      ['Share dates and realistic finish times', 'Give the date, start time, expected return time, number of children and their age groups. Explain whether the booking includes meals, a bedtime routine or staying overnight. Agree what happens if you return late or need to cancel.'],
      ['Arrange an introduction before the booking', 'Ask about experience with children of similar ages and contact references with permission. Arrange a paid introduction while a parent is present so you can explain routines and assess how you communicate. An identity check does not establish babysitting competence.'],
      ['Leave a clear handover', 'Share emergency contacts, who may collect the children and how to reach you. Explain food arrangements, allergies and household rules privately. Agree boundaries for visitors, outings and photos; avoid placing children’s personal details in a public job description.'],
      ['Plan the journey home', 'Discuss how the babysitter will arrive and leave at the agreed times. Confirm any transport contribution before the booking, especially for an evening finish. Have an agreed plan if the finish time changes.'],
      ['Confirm the full booking cost', 'Agree pay, any minimum hours, extra time and transport costs directly. Mlezi membership pays for platform access under the current plan; it does not pay the babysitter’s wages or book a caregiver automatically.'],
    ],
  },
  {
    path: '/live-in-nannies/', navLabel: 'Live-in nanny care',
    title: 'Live-in nannies in Kenya | Duties, accommodation and hiring | Mlezi',
    description: 'Prepare a live-in nanny arrangement in Kenya with clear childcare duties, accommodation, working hours, rest time and a paid trial.',
    heading: 'Build a clear live-in care arrangement.',
    intro: 'A live-in nanny lives at the family’s home under an agreed working arrangement. Before hiring, discuss both the childcare role and the practical experience of sharing a home. Accommodation does not replace agreed pay, privacy or time away from work.',
    sections: [
      ['Separate working hours from time at home', 'Set out a usual start and finish time, breaks and days away from work. Discuss evening or overnight care separately and agree how changes will be handled. Being at home should not leave either person guessing whether they are on duty.'],
      ['Explain the accommodation before agreement', 'Describe the sleeping space, access to washing facilities, meals and household arrangements accurately. Discuss private time, personal belongings, visitors and any cameras before the person moves in. Let both sides ask practical questions.'],
      ['Define childcare and household duties', 'List the children’s age groups, usual routines and any agreed school-run responsibilities. Separate child-related laundry and meals from general household cleaning or cooking. Agree priorities when childcare and other tasks compete for attention.'],
      ['Agree pay, travel and changes in writing', 'Record pay, payment dates, agreed rest, travel costs and the process for requesting additional work. Discuss what happens when the family travels or care needs change. Confirm applicable employment requirements using reliable current guidance.'],
      ['Use a paid trial and regular check-ins', 'Interview, check references with permission and arrange a paid, supervised trial. Discuss how either person can raise a concern and review the arrangement after it begins. Identity review is separate from checking references and suitability.'],
    ],
  },
  {
    path: '/travel-nannies/', navLabel: 'Travel nanny care',
    title: 'Travel nannies in Kenya | Family trip childcare planning | Mlezi',
    description: 'Plan childcare for a family trip: travel nanny experience, itinerary, working hours, accommodation, expenses and a written agreement.',
    heading: 'Agree the care plan before your family trip.',
    intro: 'A travel nanny helps a family with childcare during an agreed trip. It is a specific care arrangement with the family, rather than an overseas placement service. Mlezi does not organise travel, immigration or work permission.',
    sections: [
      ['Explain the itinerary and childcare role', 'Share the dates, destinations, children’s age groups and likely daily schedule. Describe care during journeys, family activities and any evening work. Ask about experience with similar trips and agree when a parent remains responsible.'],
      ['Set hours and rest around the trip', 'Travel days can differ from an ordinary working day. Agree how travel time, delays, overnight care and schedule changes affect duties and pay. Include time off and a clear handover rather than assuming the nanny is always available.'],
      ['Confirm accommodation and expenses', 'Agree who books and pays for transport, meals, accommodation and other necessary trip costs. Describe the sleeping arrangement in advance and discuss cancellations, changes and the return journey. Record reimbursements and payment dates clearly.'],
      ['Check requirements before committing', 'For any destination, the family and caregiver must confirm applicable entry and work requirements through official sources. A Mlezi account or identity badge grants no permission to travel or work. Do not buy travel on the assumption that a profile establishes eligibility.'],
      ['Meet and agree responsibilities first', 'Interview and check references with permission, then arrange a paid, supervised introduction before departure. Share emergency contacts privately and agree rules for outings, photos and communication during the trip.'],
    ],
  },
].map(page => ({ ...page, resources: [
  { label: 'Safe hiring checklist', href: '/safe-hiring/' },
  { label: 'What identity checks cover', href: '/identity-checks/' },
  { label: 'Care in Kenya', href: '/kenya/' },
  ...[
    ['/newborn-care/', 'Newborn care'], ['/babysitting/', 'Occasional babysitting'],
    ['/live-in-nannies/', 'Live-in nanny care'], ['/travel-nannies/', 'Travel nanny care'],
  ].filter(([path]) => path !== page.path).map(([href, label]) => ({ href, label })),
] }))
