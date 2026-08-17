export const profile = {
  name: 'Andrew Peter John Langeveldt',
  shortName: 'Andrew Langeveldt',
  initials: 'AP',
  title: 'Software Engineer · Full-Stack Web & Mobile Developer',
  tagline:
    'Software engineer and full-stack developer. I design, build, and maintain websites, databases, mobile apps, games, and automation solutions, with a problem-solving mindset and real attention to detail.',
  location: 'Gaborone, Botswana',
  email: 'andrewpjlangeveldt@gmail.com',
  phone: '+267 76541693',
  license: "Driver's License: Class B",
  availability: 'Available for full-time & freelance work',
  photo: '/andrew.jpg',
  resumeUrl: '#',
  socials: [
    { label: 'GitHub', href: 'https://github.com/WhereIsBaron', icon: 'github' as const },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/andrew-langeveldt-953789292/', icon: 'linkedin' as const },
  ],
};

export type Stat = { value: string; label: string };

export const stats: Stat[] = [
  { value: 'Honours', label: 'BSc Software Engineering' },
  { value: 'Top 13', label: 'of 547 at UN hackathon' },
  { value: '5+', label: 'Languages in production' },
  { value: 'Web3', label: 'Motoko / ICP smart contracts' },
];

export type SkillGroup = {
  category: string;
  items: { name: string; level: number }[];
};

export const skillGroups: SkillGroup[] = [
  {
    category: 'Programming',
    items: [
      { name: 'JavaScript & TypeScript', level: 92 },
      { name: 'PHP (Laravel)', level: 88 },
      { name: 'Dart (Flutter)', level: 85 },
      { name: 'Python', level: 78 },
      { name: 'Java / C++ / C', level: 75 },
      { name: 'Motoko (Web3)', level: 70 },
    ],
  },
  {
    category: 'Web & Mobile',
    items: [
      { name: 'React', level: 90 },
      { name: 'Laravel (MVC + Blade)', level: 88 },
      { name: 'Flutter & Dart', level: 85 },
      { name: 'HTML5 / CSS3 / Bootstrap', level: 92 },
      { name: 'UI/UX Principles', level: 80 },
      { name: 'REST API Integration', level: 86 },
      { name: 'SEO Optimisation', level: 82 },
      { name: 'Payment Gateways', level: 80 },
    ],
  },
  {
    category: 'Backend & Data',
    items: [
      { name: 'MySQL', level: 88 },
      { name: 'Firebase', level: 82 },
      { name: 'MongoDB', level: 78 },
      { name: 'Supabase', level: 82 },
      { name: 'Database Design', level: 85 },
      { name: 'Analytics & Data Integration', level: 80 },
      { name: 'Smart Contracts (ICP)', level: 68 },
      { name: 'Arduino / Raspberry Pi', level: 72 },
    ],
  },
  {
    category: 'Tools & Workflow',
    items: [
      { name: 'Git & GitHub', level: 90 },
      { name: 'Figma', level: 80 },
      { name: 'Adobe Suite', level: 72 },
      { name: 'Trello / Slack', level: 88 },
      { name: 'MS Project', level: 75 },
      { name: 'Blender / GIMP', level: 68 },
    ],
  },
  {
    category: 'Software Engineering',
    items: [
      { name: 'OOP & Design Patterns', level: 86 },
      { name: 'Software Testing & QA', level: 80 },
      { name: 'Data Structures & Algorithms', level: 82 },
      { name: 'Software Architecture', level: 80 },
      { name: 'SDLC & Requirements Analysis', level: 84 },
      { name: 'Human-Computer Interaction', level: 78 },
    ],
  },
  {
    category: 'Project Management (MBA)',
    items: [
      { name: 'Agile & Scrum', level: 82 },
      { name: 'Project Risk Management', level: 74 },
      { name: 'Quality Assurance & TQM', level: 76 },
      { name: 'Procurement & Integration', level: 70 },
      { name: 'Stakeholder & Team Leadership', level: 84 },
      { name: 'Research Methodology', level: 78 },
    ],
  },
];

export type Project = {
  name: string;
  category: string;
  description: string;
  year: string;
  tags: string[];
  highlights?: string[];
  link: string;
  slug?: string;
  images?: string[];
  route?: string; // if set, the card navigates to this in-app route instead of opening a gallery
};

// Build a gallery path list for screenshots in /public/projects/<slug>/NN.png
const gallery = (slug: string, count: number): string[] =>
  Array.from(
    { length: count },
    (_, i) => `/projects/${slug}/${String(i + 1).padStart(2, '0')}.png`
  );

export const projects: Project[] = [
  {
    name: 'Limkonnect — University Community Platform',
    category: 'Community Platform',
    description:
      'A full community platform for the Limkokwing University community — students, staff, and alumni. A single React + Firebase app with a trust-based access ladder (visitor → pending → alumni → verified student/staff → tutor → publisher → admin), manual ID verification, LinkedIn-style profiles, a conflict-detecting timetable engine, moderated forums, peer tutoring, and a curated newspaper feed. Built end-to-end and code-complete across all six phases.',
    year: '2025 - Present',
    tags: ['React', 'TypeScript', 'Firebase', 'Firestore', 'Tailwind', 'Netlify'],
    highlights: [
      'Trust-based access control enforced both in-app and in Firestore security rules, with anti-privilege-escalation guards so roles can only be granted by an admin.',
      'Manual ID-verification pipeline: images compressed client-side and stored in an admin-only collection (never readable in-app), with approve/reject-with-reason.',
      'Timetable engine ported from a custom spec: venue/class/lecturer conflict detection, role-aware master vs. read-only student views, and live filters.',
      'Custom forums with a slur/leetspeak-bypass word filter and an English-only guard, plus a reports panel with one-click moderation (delete, mute, suspend, remove photo).',
      'Peer-tutoring directory and a curated newspaper feed with publisher applications, article review, and per-user posting cooldowns — all admin-moderated.',
      'Runs entirely on Firebase’s free tier (no paid Storage): images are canvas-compressed to base64 within the Firestore 1MB doc cap.',
    ],
    link: '#',
  },
  {
    name: 'Universal Booking System',
    category: 'Product',
    description:
      'One booking engine any business can drop in and run: hotels, clinics, consultants, photographers, or anything that takes appointments. Configure the resource types, availability, and fields once, and the same flow adapts to the use case.',
    year: '2025 - Present',
    tags: ['React', 'TypeScript', 'Config-driven', 'Firebase (next)'],
    highlights: [
      'One engine, many verticals: hotel rooms, consultants, photography, clinics, appointments.',
      'A config-driven flow that reconfigures its resources, dates, and fields per business type.',
      'Interactive front-end demo live now; Firebase backend for real availability and bookings next.',
    ],
    route: '/booking',
    link: '#',
  },
  {
    name: 'Classroom Scheduling System',
    category: 'Final Year Project',
    description:
      'A full-stack web app that optimizes lecturer and student timetable allocation, with conflict detection and a clean, usable interface.',
    year: '2025',
    tags: ['Laravel', 'MySQL', 'Bootstrap 5', 'Full-Stack'],
    highlights: [
      'Owned system architecture and database design end-to-end.',
      'Built conflict-detection logic for timetable allocation.',
      'MVC structure with Blade templating and Bootstrap 5 UI.',
    ],
    link: '#',
    slug: 'classroom-scheduling',
    images: gallery('classroom-scheduling', 9),
  },
  {
    name: 'UN Coding4Integrity Hackathon',
    category: 'Hackathon',
    description:
      'Placed Top 13 of 547 participants. Built backend smart-contract logic in Motoko on the Internet Computer for transparent public-sector solutions.',
    year: '2024',
    tags: ['Motoko', 'ICP', 'Web3', 'Smart Contracts'],
    highlights: [
      'Top 13 of 547 participants in Pretoria, South Africa.',
      'Decentralized, transparent public-sector smart contracts.',
      'Backend logic on the Internet Computer Protocol (ICP).',
    ],
    link: '#',
  },
  {
    name: 'BHC Mobile App Hackathon',
    category: 'Hackathon',
    description:
      'Built the Flutter/Dart frontend and integrated it with a Laravel backend for seamless, API-driven user interaction at the Botswana Innovation Hub.',
    year: '2024',
    tags: ['Flutter', 'Dart', 'Laravel', 'REST API'],
    highlights: [
      'Cross-platform Flutter frontend for Android & iOS.',
      'API-driven data flow between Flutter and Laravel.',
      'Shipped at the Botswana Housing Corporation hackathon, June 2024.',
    ],
    link: '#',
    slug: 'bhc-mobile-app',
    images: gallery('bhc-mobile-app', 20),
  },
  {
    name: 'Torn Userscripts (BUSTR, FLIPR & MUGSHOT)',
    category: 'Tooling',
    description:
      "A set of Tampermonkey userscripts I build and maintain for Torn, a browser MMO, that bolt trading, combat and market-analysis tools straight into the game's own pages. The part I care most about is the plumbing: every call to Torn's REST API runs through a single key accessor, so my API key is read from local storage in one place only, never leaks into the page, and can only ever reach the official api.torn.com. No third-party server ever touches your key or your data.",
    year: '2025 - Present',
    tags: ['JavaScript', 'Tampermonkey', 'REST API integration', 'Rate limiting', 'DOM injection'],
    highlights: [
      "One choke point for the API key: it is read from Tampermonkey storage (or the Torn PDA's injected token on mobile) in a single accessor that is the only path to the network, so the key never lands in the DOM, in logs, or in debug exports.",
      'Minimal-scope keys by design - each script asks only for the API selections it actually needs (BUSTR reads basic, perks and log; FLIPR reads basic and log), so you never hand it a full-access key.',
      "A rate-limit-aware client that stays well under Torn's ~100-calls-per-minute cap: real calls are throttled to about once every 35 seconds on active pages and once every 30 minutes elsewhere, and pause entirely via the Page Visibility API the moment the tab is hidden.",
      "Reverse-engineered Torn's hidden formulas - jail-bust success and penalty curves, Mugging 2.0 payouts - and rebuilt them client-side to score every option live, with opt-in self-calibration that learns from your own logged results.",
      "FLIPR keeps tax-aware, FIFO cost-basis accounting: it records what you actually paid per item and stops you listing at a fake profit once Torn's sales tax is counted.",
      'Read-only by hard rule: the scripts only read what is already on the page and render numbers and colours - they never click, submit, or automate anything on your behalf.',
    ],
    link: '#',
    slug: 'scripts',
    images: gallery('scripts', 11),
  },
  {
    name: 'The Dying Forge',
    category: 'Game Dev',
    description:
      'A blacksmith-themed crafting and management game in active development. Players forge items, research upgrades, and assign apprentices in a guild-driven progression loop. Built in the Godot Engine with C#.',
    year: '2025',
    tags: ['Godot Engine', 'C#', 'Game Dev'],
    highlights: [
      'Crafting and resource-management gameplay loop.',
      'Research tree with apprentice and guild progression.',
      'Built in Godot 4 with C#.',
    ],
    link: '#',
    slug: 'the-dying-forge',
    images: gallery('the-dying-forge', 5),
  },
  {
    name: 'Robotics Make-a-thon',
    category: 'Hardware',
    description:
      'Programmed a robotic arm with camera recognition on Arduino and Raspberry Pi OS to simulate mineral separation through color differentiation.',
    year: '2023',
    tags: ['Arduino', 'Raspberry Pi', 'Computer Vision'],
    highlights: [
      'Robotic arm control with Arduino + Raspberry Pi OS.',
      'Camera-based color differentiation for mineral separation.',
      'University of Botswana make-a-thon, October 2023.',
    ],
    link: '#',
  },
  {
    name: 'Mzansi Web3 Bootcamp',
    category: 'Web3',
    description:
      'Team-based Web3 challenges focused on decentralized application concepts and smart-contract workflows on the Mzansi bootcamp.',
    year: '2024',
    tags: ['Web3', 'Decentralized Apps', 'Smart Contracts'],
    highlights: [
      'Team-based decentralized application concepts.',
      'Smart-contract workflow design and implementation.',
      'Mzansi Web3 Bootcamp & Hackathon, March 2024.',
    ],
    link: '#',
  },
];

export const coursework: string[] = [
  'Software Engineering & the SDLC',
  'Object-Oriented Programming (basic & advanced)',
  'Software Design and Architecture',
  'Data Structures & Algorithm Analysis',
  'Web Programming & Human-Computer Interaction',
  'Networking, Data Communication & Computer Systems',
  'Software Testing, Reliability & Quality Assurance',
  'IT Project Management & Team Collaboration',
];

export type Education = {
  degree: string;
  institution: string;
  location: string;
  period: string;
  status: string;
};

export const education: Education[] = [
  {
    degree: 'Master of Business Administration (MBA), Project Management',
    institution: 'Limkokwing University of Creative Technology',
    location: 'Gaborone Campus, Botswana',
    period: '2026 - 2028',
    status: 'In Progress',
  },
  {
    degree: 'BSc (Honours) in Software Engineering with Multimedia',
    institution: 'Limkokwing University of Creative Technology',
    location: 'Gaborone Campus, Botswana',
    period: 'October 2021 - June 2025',
    status: 'Graduated',
  },
];

export type Reference = {
  name: string;
  role: string;
  contact: string;
};

export const references: Reference[] = [
  {
    name: 'Mr. Tshegofatso Lenamile',
    role: 'Lecturer, Limkokwing University of Creative Technology',
    contact: '+267 74 412 331',
  },
  {
    name: 'Mr. Godfrey Mlambo',
    role: 'Lecturer, Limkokwing University of Creative Technology',
    contact: '+267 75 670 563',
  },
];

export const focusAreas: string[] = [
  'Full-stack development',
  'Websites & databases',
  'Mobile apps & platforms',
  'UI / UX design',
  'Game development',
  'Automation & scripting',
  'SEO optimisation',
  'Payment gateways',
  'API integration',
  'Firebase & analytics',
];
