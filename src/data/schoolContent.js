/**
 * All site content lives here.
 *
 * The school edits this file when they want to change what appears on
 * the marketing site. Everything is placeholder text, marked with
 * `// EDIT:` comments where the school will most likely swap in real
 * details.
 */

export const school = {
  // EDIT: exact school name as it should appear on the site
  name: 'Yourkids&i Academy',
  tagline: "Where early learning meets home-grown values",

  // EDIT: contact
  phone1: '0817 635 8088',
  phone2: '0813 476 3866',
  whatsapp: '2348134763866', // international format, no + or spaces — used for wa.me links
  email: 'yourkidsniacademy@gmail.com',
  address: '166, Isawo Road, Okiki Bus-Stop, Agric, Ikorodu, Lagos State',

  // EDIT: hours
  hours: {
    weekday: 'Monday – Friday · 7:00am – 6:00pm',
    saturday: 'Saturday · Drop-offs by arrangement',
    around_the_clock: '24 hours care available on request',
  },

  // EDIT: social links (leave empty string if none)
  instagram: '',
  facebook: '',
  tiktok: '',
}

// The four main programs — same shape as the flyer's pill blocks
export const programs = [
  {
    id: 'creche',
    label: '24 Hours Creche',
    ages: '3 months – 2 years',
    tone: 'coral',
    // EDIT: description
    description: 'Round-the-clock care for the tiniest ones. Warm hands, soft songs, and a rhythm that adapts to your baby, not the other way around.',
    highlights: ['Trained caregivers', 'Feeding on request', 'Sleep-friendly routines', '24/7 availability'],
  },
  {
    id: 'preschool',
    label: 'Pre-School',
    ages: '2 – 3 years',
    tone: 'plum',
    description: 'Play-based learning that gently introduces routines, colours, sounds, and the joy of being around other children.',
    highlights: ['Structured play', 'Language songs', 'Motor skills', 'Social confidence'],
  },
  {
    id: 'nursery',
    label: 'Nursery',
    ages: '3 – 5 years',
    tone: 'yellow',
    description: 'The bridge between play and school. Numbers become friends. Letters start to speak. Curiosity gets fed every day.',
    highlights: ['Phonics & early reading', 'Number sense', 'Abacus foundations', 'Creative expression'],
  },
  {
    id: 'primary',
    label: 'Primary',
    ages: '5 – 9 years',
    tone: 'sky',
    description: 'Where school gets real. A grounded curriculum, small classes, and teachers who notice when your child needs something different that day.',
    highlights: ['Full academic curriculum', 'Mental maths & abacus', 'Music, art & games', 'Character development'],
  },
]

// The extras — bullet-list-style differentiators
export const extras = [
  {
    icon: 'home',
    title: 'Mobile childcare service',
    description: "We come to you. For the days when getting out of the house is more than you have.",
  },
  {
    icon: 'moon',
    title: 'Live-in & weekend drop-off',
    description: 'For working parents, night shifts, business trips, or the occasional break you deserve.',
  },
  {
    icon: 'brain',
    title: 'Abacus & mental maths',
    description: 'Numbers become intuitive. Confidence follows. Real skills, not memorised tricks.',
  },
  {
    icon: 'music',
    title: 'Music & games',
    description: 'Rhythm, movement, singing. Learning that never feels like sitting still.',
  },
]

// Why-us differentiators
export const differentiators = [
  {
    number: '01',
    title: 'Around your life',
    body: '24-hour care, weekend drop-offs, live-in options. We work with your schedule, not against it.',
  },
  {
    number: '02',
    title: 'Small classes, real attention',
    body: "Every child is known by name, mood, and favourite colour. Nobody slips through the cracks.",
  },
  {
    number: '03',
    title: 'Learning through play',
    body: "Abacus, mental maths, music, movement. Skills your child will actually enjoy building.",
  },
  {
    number: '04',
    title: 'Home-grown values',
    body: 'Manners, courage, kindness, curiosity — the things that stay long after the school day ends.',
  },
]

// About the school
export const about = {
  // EDIT: mission
  mission: 'To love your child, teach them well, and make your life a little easier.',
  // EDIT: story — 2-3 paragraphs
  story: [
    'Yourkids&i Academy was built for parents who need more than a school. We saw the working mothers with early meetings and late finishes. The fathers on shift work. The families where "school hours" simply do not fit.',
    "So we opened a place where a child can be dropped off before dawn or picked up after dark, and either way find warmth, structure, and someone who knows their name.",
    'From the 24-hour creche to Primary 3, everything we do sits on one belief: children learn best when they feel safe, seen, and celebrated. And parents rest easier when they know their child is somewhere that treats them like family.',
  ],
  // EDIT: values
  values: [
    { title: 'Warmth', body: 'Every child feels held. Every day.' },
    { title: 'Rigor', body: 'Real learning, delivered patiently.' },
    { title: 'Convenience', body: "We adapt to your family's shape." },
    { title: 'Character', body: 'Manners and kindness taught alongside letters.' },
  ],
}

// EDIT: sample events — replace with real ones as they come up
export const events = [
  {
    date: '2026-09-14',
    title: 'Fall Term Resumes',
    description: 'All children return for the new academic session. Uniforms available at the school office.',
    tag: 'Term',
  },
  {
    date: '2026-10-10',
    title: 'Open Day for New Parents',
    description: "Tour the school, meet the teachers, ask anything. Refreshments on us. Bring the child if you'd like.",
    tag: 'Admissions',
  },
  {
    date: '2026-11-22',
    title: 'Cultural Day & Family Picnic',
    description: 'Traditional attire, home-cooked food, music, and games. Parents welcome — and encouraged — to join in.',
    tag: 'Community',
  },
  {
    date: '2026-12-15',
    title: 'End of Year Presentation',
    description: 'Children showcase what they learned. Songs, poems, dances, and one very moving speech from Primary 3.',
    tag: 'Showcase',
  },
]

// Testimonials — placeholder until real ones are gathered
export const testimonials = [
  {
    quote: "My daughter used to cry when I dropped her off. Now she cries when I pick her up too early.",
    author: 'A Nursery 2 parent',
  },
  {
    quote: "I work night shifts. Yourkids&i is the reason my son still gets bedtime stories.",
    author: 'A Primary 1 parent',
  },
  {
    quote: "The abacus program changed how my son sees numbers. He does mental maths for fun now.",
    author: 'A Primary 3 parent',
  },
]
