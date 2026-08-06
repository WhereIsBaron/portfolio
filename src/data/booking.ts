// Config that drives the universal booking demo. Each "vertical" is a business type;
// the same booking flow reads this config and adapts its resources, date mode, and
// fields. Adding a new business type is just another entry here, no new UI code.

export type Resource = { id: string; name: string; detail: string; price: string };

export type ExtraField = {
  name: string;
  label: string;
  type: 'text' | 'textarea';
  placeholder?: string;
};

export type Vertical = {
  id: string;
  name: string;
  icon: 'hotel' | 'consultant' | 'photography' | 'clinic' | 'appointment';
  blurb: string;
  resourceLabel: string;
  resources: Resource[];
  dateMode: 'range' | 'slot';
  timeSlots?: string[];
  partyLabel?: string;
  extra?: ExtraField[];
  cta: string;
};

const SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

export const verticals: Vertical[] = [
  {
    id: 'hotel',
    name: 'Hotel rooms',
    icon: 'hotel',
    blurb: 'Availability by date range, per room type, with guest counts.',
    resourceLabel: 'Room type',
    resources: [
      { id: 'standard', name: 'Standard Room', detail: 'Queen bed, city view', price: 'P650 / night' },
      { id: 'deluxe', name: 'Deluxe Room', detail: 'King bed, balcony', price: 'P980 / night' },
      { id: 'suite', name: 'Executive Suite', detail: 'Lounge + kitchenette', price: 'P1,750 / night' },
    ],
    dateMode: 'range',
    partyLabel: 'Guests',
    extra: [{ name: 'requests', label: 'Special requests', type: 'textarea', placeholder: 'Early check-in, cot, etc.' }],
    cta: 'Book room',
  },
  {
    id: 'consultant',
    name: 'Consultants',
    icon: 'consultant',
    blurb: 'Time-slot sessions with a chosen expert, billed per hour.',
    resourceLabel: 'Consultant',
    resources: [
      { id: 'strategy', name: 'Business Strategy', detail: 'Andrew L.', price: 'P450 / hour' },
      { id: 'finance', name: 'Financial Advisory', detail: 'T. Mokoena', price: 'P520 / hour' },
      { id: 'legal', name: 'Legal Consult', detail: 'K. Dube', price: 'P600 / hour' },
    ],
    dateMode: 'slot',
    timeSlots: SLOTS,
    extra: [{ name: 'topic', label: 'What do you want to cover?', type: 'textarea', placeholder: 'A sentence or two about your goal' }],
    cta: 'Book session',
  },
  {
    id: 'photography',
    name: 'Photography',
    icon: 'photography',
    blurb: 'Shoot packages booked to a date and start time, at your location.',
    resourceLabel: 'Package',
    resources: [
      { id: 'portrait', name: 'Portrait Session', detail: '1 hour, 10 edited photos', price: 'P800' },
      { id: 'event', name: 'Event Coverage', detail: 'Up to 4 hours', price: 'P2,400' },
      { id: 'wedding', name: 'Wedding Package', detail: 'Full day, 2 shooters', price: 'P7,500' },
    ],
    dateMode: 'slot',
    timeSlots: ['08:00', '10:00', '12:00', '14:00', '16:00'],
    extra: [{ name: 'location', label: 'Shoot location', type: 'text', placeholder: 'Studio, venue, or address' }],
    cta: 'Book shoot',
  },
  {
    id: 'clinic',
    name: 'Clinic',
    icon: 'clinic',
    blurb: 'Practitioner appointments in time slots, with a reason for the visit.',
    resourceLabel: 'Practitioner',
    resources: [
      { id: 'gp', name: 'Dr. Sithole', detail: 'General practice', price: 'P350' },
      { id: 'dental', name: 'Dr. Owusu', detail: 'Dental', price: 'P500' },
      { id: 'physio', name: 'M. Radebe', detail: 'Physiotherapy', price: 'P400' },
    ],
    dateMode: 'slot',
    timeSlots: SLOTS,
    extra: [{ name: 'reason', label: 'Reason for visit', type: 'textarea', placeholder: 'Briefly describe your symptoms or need' }],
    cta: 'Book appointment',
  },
  {
    id: 'appointment',
    name: 'Appointments',
    icon: 'appointment',
    blurb: 'A generic service booking any business can rename and reuse.',
    resourceLabel: 'Service',
    resources: [
      { id: 's1', name: 'Quick Consult', detail: '15 minutes', price: 'Free' },
      { id: 's2', name: 'Standard Service', detail: '30 minutes', price: 'P150' },
      { id: 's3', name: 'Extended Service', detail: '60 minutes', price: 'P280' },
    ],
    dateMode: 'slot',
    timeSlots: SLOTS,
    cta: 'Book appointment',
  },
];
