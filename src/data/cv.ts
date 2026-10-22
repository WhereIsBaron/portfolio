export const profile = {
  name: 'Andrew Peter John Langeveldt',
  shortName: 'Andrew Langeveldt',
  initials: 'AP',
  title: 'Junior Software Engineer · Full-Stack Web & Mobile Developer',
  tagline:
    'Software engineer and full-stack developer. I design, build, and maintain websites, databases, mobile apps, games, and automation solutions, with a problem-solving mindset and real attention to detail.',
  location: 'Gaborone, Botswana',
  birthDate: '1996-09-13', // Gaborone time (UTC+2); drives the live age counter + AI assistant
  email: 'andrewpjlangeveldt@gmail.com',
  phone: '+267 76541693',
  license: "Driver's License: Class B",
  availability: 'Available for full-time & freelance work',
  photo: '/andrew.jpg',
  resumeUrl: '/cv', // printable CV generated from this file (src/pages/CvPage.tsx)
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
  items: string[];
};

export const skillGroups: SkillGroup[] = [
  {
    category: 'Programming',
    items: [
      'JavaScript & TypeScript',
      'PHP (Laravel)',
      'Dart (Flutter)',
      'Python',
      'C# (.NET / Godot)',
      'Java',
      'C++ / C',
      'Motoko (Web3)',
      'SQL',
    ],
  },
  {
    category: 'Web & Mobile',
    items: [
      'React',
      'React Router',
      'Vite',
      'Laravel (MVC + Blade)',
      'Flutter & Dart',
      'HTML5 / CSS3',
      'Tailwind CSS',
      'Bootstrap',
      'Responsive Design',
      'UI/UX Principles',
      'REST API Integration',
      'SEO Optimisation',
      'Payment Gateways',
    ],
  },
  {
    category: 'Backend & Data',
    items: [
      'MySQL',
      'Firebase (Auth, Firestore, Storage)',
      'Firestore Security Rules',
      'MongoDB',
      'Supabase',
      'Database Design',
      'Analytics & Data Integration',
      'Smart Contracts (ICP)',
      'Arduino / Raspberry Pi',
    ],
  },
  {
    category: 'Tools & Workflow',
    items: [
      'Git & GitHub',
      'Netlify',
      'Godot Engine',
      'Tampermonkey / Userscripts',
      'Figma',
      'Adobe Suite',
      'Blender',
      'GIMP',
      'Trello / Slack',
      'MS Project',
    ],
  },
  {
    category: 'Software Engineering',
    items: [
      'OOP & Design Patterns',
      'Software Architecture',
      'Data Structures & Algorithms',
      'Software Testing & QA',
      'SDLC & Requirements Analysis',
      'Human-Computer Interaction',
      'REST API Design & Rate Limiting',
      'Reverse Engineering',
    ],
  },
  {
    category: 'Project Management (MBA)',
    items: [
      'Agile & Scrum',
      'Project Risk Management',
      'Quality Assurance & TQM',
      'Procurement & Integration',
      'Stakeholder & Team Leadership',
      'Research Methodology',
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
  wordmark?: string; // if set (with route), the card thumbnail shows the "Andrew.<wordmark>" logo
  // Support-ticket view (Projects section). Steps taken = highlights, Stack = tags.
  issue?: string; // the problem the project solved; empty = TODO (shown only in owner edit mode)
  resolution?: string; // optional; falls back to `description`
  ticketId?: string; // optional override; defaults to AL-1001, AL-1002… by array position
  status?: 'Resolved' | 'In progress'; // defaults to 'Resolved'
};

// Build a gallery path list for screenshots in /public/projects/<slug>/NN.png
const gallery = (slug: string, count: number): string[] =>
  Array.from(
    { length: count },
    (_, i) => `/projects/${slug}/${String(i + 1).padStart(2, '0')}.png`
  );

export const projects: Project[] = [
  {
    name: 'Production Supervisor Training',
    category: 'Product',
    description:
      'An interactive training simulator for new chemical plant supervisors — covering daily production management, quality control, safety & compliance, team leadership, inventory, and continuous improvement. Built from real manufacturing workflows.',
    year: '2026',
    issue: '', // TODO(Andrew): the problem this solved, 1-2 sentences (ticket "Issue")
    tags: ['React', 'TypeScript', 'Operations', 'Manufacturing', 'Training'],
    highlights: [
      '6 in-depth modules covering OEE, PPE, GHS pictograms, Permit to Work, batch release decisions, and Kaizen — with a clickable glossary for every key term.',
      'Interactive scenario blocks per module: pick the correct supervisor response, get immediate expert feedback on your reasoning.',
      'Live OEE calculator (Availability × Performance × Quality) with drag sliders — see world-class vs. below-average benchmarks in real time.',
      'Progress tracking with localStorage persistence — mark modules complete, resume where you left off, unlock the completion banner at 100%.',
      'Collapsible concept cards (shift briefing, FEFO vs. FIFO, 5 Whys, PDCA, Heinrich\'s Triangle) and a GHS hazard pictogram reference grid.',
    ],
    route: '/production',
    wordmark: 'OPS',
    link: '#',
  },
  {
    name: 'Limkonnect — University Community Platform',
    category: 'Community Platform',
    description:
      'A full community platform for the Limkokwing University community — students, staff, and alumni. A single React + Firebase app with a trust-based access ladder (visitor → pending → alumni → verified student/staff → tutor → publisher → admin), manual ID verification, LinkedIn-style profiles, a conflict-detecting timetable engine, moderated forums, peer tutoring, and a curated newspaper feed. Built end-to-end and code-complete across all six phases.',
    year: '2026 - Present',
    issue: '', // TODO(Andrew): the problem this solved, 1-2 sentences (ticket "Issue")
    tags: ['React', 'TypeScript', 'Firebase', 'Firestore', 'Tailwind', 'Netlify'],
    highlights: [
      'Trust-based access control enforced both in-app and in Firestore security rules, with anti-privilege-escalation guards so roles can only be granted by an admin.',
      'Manual ID-verification pipeline: images compressed client-side and stored in an admin-only collection (never readable in-app), with approve/reject-with-reason.',
      'Timetable engine ported from a custom spec: venue/class/lecturer conflict detection, role-aware master vs. read-only student views, and live filters.',
      'Custom forums with a slur/leetspeak-bypass word filter and an English-only guard, plus a reports panel with one-click moderation (delete, mute, suspend, remove photo).',
      'Peer-tutoring directory and a curated newspaper feed with publisher applications, article review, and per-user posting cooldowns — all admin-moderated.',
      'Runs entirely on Firebase’s free tier (no paid Storage): images are canvas-compressed to base64 within the Firestore 1MB doc cap.',
    ],
    link: 'https://limkonnect.netlify.app/',
    slug: 'limkonnect',
    images: gallery('limkonnect', 5),
  },
  {
    name: 'Universal Booking System',
    category: 'Product',
    description:
      'One booking engine any business can drop in and run: hotels, clinics, consultants, photographers, or anything that takes appointments. Configure the resource types, availability, and fields once, and the same flow adapts to the use case.',
    year: '2026 - Present',
    issue: '', // TODO(Andrew): the problem this solved, 1-2 sentences (ticket "Issue")
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
    name: 'CRM System',
    category: 'Product',
    description:
      'A full-fledged customer-relationship platform simulated end to end, with workflows modelled on EspoCRM and ERPNext: lead capture and one-click conversion, contacts and companies, a deal pipeline with lost-reason tracking, support cases, tasks, a calendar, an email inbox with templates, invoicing, marketing campaigns, workflow automations, and a reporting suite — all driven by a live dashboard. Sample identities are pulled from a public API so the whole thing feels real.',
    year: '2026 - Present',
    issue: '', // TODO(Andrew): the problem this solved, 1-2 sentences (ticket "Issue")
    tags: ['React', 'TypeScript', 'Public APIs', 'Supabase (next)'],
    highlights: [
      'Fourteen interactive modules including a lead pipeline that converts a qualified lead into a contact, company, and opportunity in one click (the core EspoCRM/ERPNext flow), plus a support-case desk.',
      'Everything is clickable — qualify and convert leads, advance deals, mark a deal lost with a reason and competitor, resolve support cases, send replies from templates, mark invoices paid, and watch the reports update.',
      'Sample data populated live from randomuser.me with DiceBear avatars and a seeded generator; a Supabase-backed version with persisted records is next.',
    ],
    route: '/crm',
    wordmark: 'CRM',
    link: '#',
  },
  {
    name: 'ERP System',
    category: 'Product',
    description:
      'A full enterprise resource-planning suite simulated end to end, modelled on systems like ERPNext: a live double-entry general ledger that derives the P&L and balance sheet, cascading sales/purchase document chains with VAT, a perpetual stock ledger, manufacturing with routings and built-up valuation, payroll runs, HR, projects, and a depreciating fixed-asset register — all feeding a live financial dashboard. Real products and people are pulled from public APIs so the data feels genuine.',
    year: '2026 - Present',
    issue: '', // TODO(Andrew): the problem this solved, 1-2 sentences (ticket "Issue")
    tags: ['React', 'TypeScript', 'Public APIs', 'Supabase (next)'],
    highlights: [
      'A real double-entry general ledger: every action — deliver, invoice, receive, pay, manufacture, run payroll — posts balanced entries, and the P&L, balance sheet and chart of accounts are derived live from them (the sheet stays in balance as you go).',
      'Full document chains with VAT: sales order → delivery note → tax invoice → payment (and PO → receipt → bill → payment), plus a manufacturing routing that consumes a BOM, applies workstation labour/overhead, and values the finished good at material + operating cost — all traced through a perpetual stock ledger.',
      'Inventory items come live from DummyJSON and staff from randomuser.me, layered on a seeded generator; a Supabase-backed version with persisted records is next.',
    ],
    route: '/erp',
    wordmark: 'ERP',
    link: '#',
  },
  {
    name: 'Class Timetable Scheduler',
    category: 'Full-Stack Application',
    description:
      'A Supabase-backed university timetable scheduling system with real-time conflict detection — room, lecturer, and cohort clashes surfaced instantly without a page reload. Admin controls let the owner add, reschedule, or soft-delete sessions; conflicts include suggested fixes. TypeScript port of a sweep-cluster conflict-detection algorithm.',
    year: '2026 - Present',
    issue: '', // TODO(Andrew): the problem this solved, 1-2 sentences (ticket "Issue")
    tags: ['React', 'TypeScript', 'Supabase', 'PostgreSQL', 'RLS'],
    highlights: [
      'O(n log n) sweep-cluster conflict detector — room, lecturer, cohort dimensions in one pass.',
      'Greedy lane-packing renders overlapping sessions side-by-side without overlap.',
      'Supabase RLS: public read, owner-only writes — no custom auth middleware.',
    ],
    route: '/timetable',
    wordmark: 'SCH',
    link: '#',
  },
  {
    name: 'Family Tree',
    category: 'Full-Stack Application',
    description:
      'An interactive family tree builder — admin-managed, publicly viewable. Drag-pannable canvas with SVG connectors, automatic relationship labels (uncle/aunt, 1st cousin, etc.), country flags, and click-through profile cards with photos. Family members submit branches via a form; the admin reviews and adds them to the main tree.',
    year: '2026 - Present',
    issue: '', // TODO(Andrew): the problem this solved, 1-2 sentences (ticket "Issue")
    tags: ['React', 'TypeScript', 'Supabase', 'PostgreSQL', 'RLS', 'Tailwind'],
    highlights: [
      'Lowest-common-ancestor relationship engine — labels any two people automatically (half-siblings, in-laws, step-relations, 2nd cousins twice removed, great-grandparents), and recomputes every label live from any chosen person\'s point of view.',
      'Pannable, zoomable canvas with SVG cubic-bezier connectors for parent/child and dashed gold lines for spouses.',
      'Photo gallery per person (up to 5 images) stored in Supabase Storage with public URLs.',
      'Branch submission flow: family members fill a form, admin reviews pending submissions with approve/reject and notes.',
      'Supabase RLS: public read on all nodes, authenticated-only writes, anonymous inserts for submissions.',
    ],
    route: '/family-tree',
    wordmark: 'FAM',
    link: '#',
  },
  {
    name: 'Oracle DBA Console',
    category: 'Full-Stack Application',
    description:
      'A simulated Oracle 19c operations console covering the daily work of a database administrator: instance health monitoring (CPU, memory, tablespaces, wait events, active sessions), RMAN backup & recovery with restore points, SQL performance tuning with a visual EXPLAIN plan tree, and a script runner that executes against a seeded schema. Every metric is generated from a fixed seed, so the console is fully reproducible client-side.',
    year: '2026',
    issue: '', // TODO(Andrew): the problem this solved, 1-2 sentences (ticket "Issue")
    tags: ['React', 'TypeScript', 'SQL', 'Oracle', 'Tailwind'],
    highlights: [
      'Instance-health dashboard: tablespace usage bars with autoextend flags, top wait events by DB-time class, and a live V$SESSION-style active-session monitor.',
      'Backup & recovery board: RMAN job history with completed/failed states, a real failure diagnosis (ORA-19809 / FRA full), recovery-window policy, and guaranteed restore points by SCN.',
      'SQL performance tuning: top SQL ranked by elapsed time, each with a recursive EXPLAIN plan-tree visualiser showing per-step row estimates and cost share, plus an indexing/tuning note.',
      'Script runner: pick a script (health check, index DDL, tablespace report), "execute" it against the seeded schema, and watch an SQL*Plus-style output log with a tabular result grid.',
      'Reference systems studied for UX only (CloudBeaver, Percona PMM) — all logic, data and UI are original.',
    ],
    route: '/dba',
    wordmark: 'DBA',
    link: '#',
  },
  {
    name: 'Retail Operations Console',
    category: 'Full-Stack Application',
    description:
      'A store-operations cockpit for a multi-branch retailer — a working point-of-sale register that rings up a real basket with 14% VAT, cash/card tender and change, plus a live sales overview, multi-store inventory with replenishment flags, and POS terminal fleet health. Prices in Botswana Pula; every figure is generated from a fixed seed so the console is reproducible client-side.',
    year: '2026',
    issue: '', // TODO(Andrew): the problem this solved, 1-2 sentences (ticket "Issue")
    tags: ['React', 'TypeScript', 'Retail', 'POS', 'Tailwind'],
    highlights: [
      'Interactive POS register: tap products into a cart, adjust quantities, and tender by cash or card — the demo computes subtotal, VAT, total, rounds cash to the nearest note, and prints a receipt with change.',
      'Sales overview: revenue/transaction/basket KPIs, a sales-by-hour bar chart with lunch and evening peaks, top sellers, and per-store performance.',
      'Multi-store inventory: a product × store stock grid with reorder-point highlighting and one-click replenishment suggestions for the branches that are low.',
      'POS terminal fleet health: online/syncing/offline device cards across all stores with an offline alert and a first-line troubleshooting note — the daily work of an in-store IT officer.',
      'Reference systems studied for UX only (Odoo POS & Inventory) — all logic, data and UI are original.',
    ],
    route: '/retail',
    wordmark: 'POS',
    link: '#',
  },
  {
    name: 'IT Helpdesk & Asset Console',
    category: 'Full-Stack Application',
    description:
      'A service-desk cockpit for an IT support officer — a ticket queue with live SLA tracking, a fully interactive ticket detail (reassign, reprioritise, reply, resolve, and watch the SLA recompute), an IT asset register (CMDB-lite) with warranty flags, and an SLA policy board. Tickets are stateful in-session, so the workflow behaves like a real desk. Seeded data is fixed.',
    year: '2026',
    issue: '', // TODO(Andrew): the problem this solved, 1-2 sentences (ticket "Issue")
    tags: ['React', 'TypeScript', 'ITSM', 'Helpdesk', 'Tailwind'],
    highlights: [
      'SLA engine: per-priority response and resolution targets drive live Met / On track / Due soon / Breached states that recompute as you work a ticket — the first agent reply stops the response clock.',
      'Interactive ticket workflow: change status, priority and assignee from dropdowns, post a threaded reply, and resolve/reopen — all held in React state so the queue, dashboard and SLA board update together.',
      'Dashboard: open-ticket and SLA-at-risk KPIs, queue-by-status tiles, open tickets by category, and a live at-risk list.',
      'Asset register (CMDB): laptops, desktops, printers and network gear with status, assignee, location and warranty-expiry flags, filterable by status with an out-of-warranty budget alert.',
      'Reference systems studied for UX only (GLPI, osTicket) — all logic, data and UI are original.',
    ],
    route: '/helpdesk',
    wordmark: 'DESK',
    link: '#',
  },
  {
    name: 'Health Research Data Platform',
    category: 'Full-Stack Application',
    description:
      'An Electronic Data Capture (EDC) console for a multi-site clinical study — an enrolment and data-quality overview, a de-identified participant register, an electronic Case Report Form whose edit-checks validate every value as you type and auto-raise a data query when a value falls out of range, and a data-query (discrepancy) workbench those queries flow into. The data-management loop is live in-session; all data is fixed and entirely fictional.',
    year: '2026',
    issue: '', // TODO(Andrew): the problem this solved, 1-2 sentences (ticket "Issue")
    tags: ['React', 'TypeScript', 'Clinical Research', 'EDC', 'Data Quality'],
    highlights: [
      'Electronic CRF with live edit-checks: required-field and range validation runs on every keystroke, flagging in-range / out-of-range / implausible values and blocking save until hard errors are fixed.',
      'Auto-raised data queries: saving a form with out-of-range values raises a discrepancy for each, which appears immediately in the query workbench — mirroring the real site/data-manager loop.',
      '21 CFR Part 11-style audit trail: every saved value is logged with the entering user, timestamp and form context on save.',
      'Study overview and de-identified register: enrolment by site, CRF completion by form, 1:1 randomisation balance, and a participant table using site-sequential codes only (no personal identifiers).',
      'Reference system studied for UX only (OpenClinica) — all logic, data and UI are original.',
    ],
    route: '/edc',
    wordmark: 'EDC',
    link: '#',
  },
  {
    name: 'Network Operations Dashboard',
    category: 'Full-Stack Application',
    description:
      'A live NOC monitoring wall for a network team — routers, switches, firewalls, WAN links and services polled on a timer, with Uptime-Kuma-style heartbeat history, per-monitor latency analytics (p50/p95/timeouts), and an incident log that opens and resolves itself as monitors flap and recover. The polling simulation runs in-session; the seed state is fixed.',
    year: '2026',
    issue: '', // TODO(Andrew): the problem this solved, 1-2 sentences (ticket "Issue")
    tags: ['React', 'TypeScript', 'Network Monitoring', 'NOC', 'Observability'],
    highlights: [
      'Live status wall: monitors are polled every few seconds, each check re-sampling latency and able to flap Up → Degraded → Down and recover — pause the poll or trigger a check on demand.',
      'Self-updating incident log: incidents open automatically when a monitor stops responding and resolve when it recovers, with manual acknowledge / resolve and severity by device role.',
      'Heartbeat history and latency analytics: a colour-coded beat bar per monitor plus a per-monitor response-time chart with p50 / p95 / max and timeout counts.',
      'Topology rollup: devices grouped into Core, Edge & WAN and Services tiers with a live availability and up/down summary per tier.',
      'Reference systems studied for UX only (Uptime Kuma, Zabbix) — all logic, data and UI are original.',
    ],
    route: '/noc',
    wordmark: 'NOC',
    link: '#',
  },
  {
    name: 'UN Coding4Integrity Hackathon',
    category: 'Hackathon',
    description:
      'Placed Top 13 of 547 participants. Built backend smart-contract logic in Motoko on the Internet Computer for transparent public-sector solutions.',
    year: '2024',
    issue: '', // TODO(Andrew): the problem this solved, 1-2 sentences (ticket "Issue")
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
    issue: '', // TODO(Andrew): the problem this solved, 1-2 sentences (ticket "Issue")
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
    issue: '', // TODO(Andrew): the problem this solved, 1-2 sentences (ticket "Issue")
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
    issue: '', // TODO(Andrew): the problem this solved, 1-2 sentences (ticket "Issue")
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
    issue:
      'Sorting mined ore by type is slow and labour-intensive when done by hand. The Technology & Skills Transfer Makeathon challenge was to prototype an automated way to separate minerals using low-cost hardware.',
    tags: ['Arduino', 'Raspberry Pi', 'Computer Vision'],
    slug: 'robotics-make-a-thon',
    images: gallery('robotics-make-a-thon', 1),
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
    issue: '', // TODO(Andrew): the problem this solved, 1-2 sentences (ticket "Issue")
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
