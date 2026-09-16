-- University class timetable scheduling system.
--
-- Four tables: rooms, cohorts, lecturers, sessions (the weekly timetable).
-- Public read for any visitor; owner-only writes via RLS.
-- The session soft-delete flag lets the conflict detector run over a clean
-- active set without gap-filling deleted IDs.

-- ── Lookup tables ─────────────────────────────────────────────────────────────

create table if not exists public.tt_rooms (
  id       serial primary key,
  name     text not null,
  type     text not null default 'lecture',  -- lecture | lab | studio | seminar
  capacity int  not null default 0,
  floor    text not null default ''
);

create table if not exists public.tt_cohorts (
  id      serial primary key,
  code    text not null unique,
  title   text not null,
  faculty text not null,
  year    int  not null default 1,
  level   text not null default 'Undergraduate'  -- Undergraduate | Postgraduate
);

create table if not exists public.tt_lecturers (
  id      serial primary key,
  name    text not null,
  faculty text not null,
  email   text not null default ''
);

-- ── Session table ─────────────────────────────────────────────────────────────

create table if not exists public.tt_sessions (
  id           serial primary key,
  day_of_week  int  not null check (day_of_week between 1 and 5),  -- 1=Mon … 5=Fri
  start_min    int  not null,                                        -- minutes from midnight
  duration_min int  not null check (duration_min in (60,90,120,180)),
  room_id      int  references public.tt_rooms(id),
  cohort_id    int  not null references public.tt_cohorts(id),
  lecturer_id  int  references public.tt_lecturers(id),
  module_code  text not null default '',
  module_title text not null,
  deleted      boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists tt_sessions_day_idx on public.tt_sessions (day_of_week) where not deleted;

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.tt_rooms     enable row level security;
alter table public.tt_cohorts   enable row level security;
alter table public.tt_lecturers enable row level security;
alter table public.tt_sessions  enable row level security;

-- Anyone (anon + authenticated) may read every table.
create policy "public reads tt_rooms"     on public.tt_rooms     for select using (true);
create policy "public reads tt_cohorts"   on public.tt_cohorts   for select using (true);
create policy "public reads tt_lecturers" on public.tt_lecturers for select using (true);
create policy "public reads tt_sessions"  on public.tt_sessions  for select using (true);

-- Only the portfolio owner may write.
create policy "owner manages tt_rooms"
  on public.tt_rooms for all to authenticated
  using     ((auth.jwt() ->> 'email') = 'andrewpjlangeveldt@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'andrewpjlangeveldt@gmail.com');

create policy "owner manages tt_cohorts"
  on public.tt_cohorts for all to authenticated
  using     ((auth.jwt() ->> 'email') = 'andrewpjlangeveldt@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'andrewpjlangeveldt@gmail.com');

create policy "owner manages tt_lecturers"
  on public.tt_lecturers for all to authenticated
  using     ((auth.jwt() ->> 'email') = 'andrewpjlangeveldt@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'andrewpjlangeveldt@gmail.com');

create policy "owner manages tt_sessions"
  on public.tt_sessions for all to authenticated
  using     ((auth.jwt() ->> 'email') = 'andrewpjlangeveldt@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'andrewpjlangeveldt@gmail.com');

-- ── Seed data ─────────────────────────────────────────────────────────────────
-- 8 rooms · 5 cohorts · 6 lecturers · 22 sessions (2 intentional conflicts).

insert into public.tt_rooms (name, type, capacity, floor) values
  ('Lecture Hall A',  'lecture', 120, 'Ground'),
  ('Lecture Hall B',  'lecture',  80, 'Ground'),
  ('Room 101',        'lecture',  45, '1st'),
  ('Room 201',        'lecture',  45, '2nd'),
  ('Room 301',        'lecture',  40, '3rd'),
  ('Computer Lab 1',  'lab',      30, '1st'),
  ('Design Studio',   'studio',   25, '2nd'),
  ('Seminar Room',    'seminar',  20, '3rd');

insert into public.tt_cohorts (code, title, faculty, year, level) values
  ('BSSE1', 'BSc Software Engineering Year 1', 'ICT',      1, 'Undergraduate'),
  ('BSSE2', 'BSc Software Engineering Year 2', 'ICT',      2, 'Undergraduate'),
  ('BSIT1', 'BSc Information Technology Year 1', 'ICT',    1, 'Undergraduate'),
  ('BSIB1', 'BSc International Business Year 1', 'Business', 1, 'Undergraduate'),
  ('BAGD1', 'BA Graphic Design Year 1',          'Design',   1, 'Undergraduate');

insert into public.tt_lecturers (name, faculty, email) values
  ('Dr. A. Chen',      'ICT',      'a.chen@uni.ac'),
  ('Prof. B. Williams','ICT',      'b.williams@uni.ac'),
  ('Dr. C. Patel',     'ICT',      'c.patel@uni.ac'),
  ('Ms. D. Ndlovu',    'Business', 'd.ndlovu@uni.ac'),
  ('Mr. E. Osei',      'Business', 'e.osei@uni.ac'),
  ('Dr. F. Mokoena',   'Design',   'f.mokoena@uni.ac');

-- start_min: 480=08:00  540=09:00  600=10:00  660=11:00  720=12:00
--            780=13:00  840=14:00  900=15:00
-- Rooms:  1=LH-A  2=LH-B  3=R101  4=R201  5=R301  6=Lab1  7=Studio  8=Seminar
-- Cohorts:1=BSSE1 2=BSSE2 3=BSIT1 4=BSIB1 5=BAGD1
-- Lecturers: 1=Chen  2=Williams  3=Patel  4=Ndlovu  5=Osei  6=Mokoena

-- BSSE1
insert into public.tt_sessions (day_of_week,start_min,duration_min,room_id,cohort_id,lecturer_id,module_code,module_title) values
  (1, 480,120, 3,1,1,'CS101','Intro to Programming'),
  (2, 480,180, 1,1,2,'CS102','Mathematics for Computer Science'),
  (3, 840,120, 6,1,3,'CS103','Web Development Lab'),
  (5, 600,120, 3,1,1,'CS104','Operating Systems');

-- BSSE2
insert into public.tt_sessions (day_of_week,start_min,duration_min,room_id,cohort_id,lecturer_id,module_code,module_title) values
  (1, 600,180, 2,2,1,'CS201','Data Structures & Algorithms'),
  (3, 480,180, 1,2,2,'CS202','Software Engineering'),
  (4, 840,120, 4,2,3,'CS203','Database Systems'),
  (5, 480,120, 5,2,2,'CS204','Computer Architecture');

-- BSIT1
insert into public.tt_sessions (day_of_week,start_min,duration_min,room_id,cohort_id,lecturer_id,module_code,module_title) values
  (2, 600,120, 4,3,3,'IT101','Computer Networks'),
  (4, 480,180, 2,3,1,'IT102','Systems Analysis & Design'),
  (5, 840, 90, 8,3,4,'IT103','IT Project Management');

-- BSIB1
insert into public.tt_sessions (day_of_week,start_min,duration_min,room_id,cohort_id,lecturer_id,module_code,module_title) values
  (1, 480,120, 1,4,4,'BUS101','Business Communications'),
  (2, 840,120, 8,4,5,'BUS102','Microeconomics'),
  (4, 600,120, 3,4,4,'BUS103','Accounting Principles'),
  (5, 600, 90, 8,4,5,'BUS104','Marketing Fundamentals');

-- BAGD1
insert into public.tt_sessions (day_of_week,start_min,duration_min,room_id,cohort_id,lecturer_id,module_code,module_title) values
  (2, 480,180, 7,5,6,'DES101','Design Fundamentals'),
  (3, 840,120, 7,5,6,'DES102','Visual Communication'),
  (5, 480,120, 7,5,6,'DES103','Digital Media Production');

-- ── Intentional conflicts (to showcase detection) ─────────────────────────────

-- ROOM conflict: Mon 08:00 Lecture Hall A is used by BUS101 (cohort 4, session 13).
-- Adding BSSE2 "Discrete Mathematics" in the same room at the same time.
insert into public.tt_sessions (day_of_week,start_min,duration_min,room_id,cohort_id,lecturer_id,module_code,module_title) values
  (1, 480,120, 1,2,2,'CS205','Discrete Mathematics');

-- LECTURER conflict: Dr. Chen (1) already teaches CS104 on Fri 10:00 (start 600).
-- Adding BAGD1 "Creative Technology" with the same lecturer at the same slot.
insert into public.tt_sessions (day_of_week,start_min,duration_min,room_id,cohort_id,lecturer_id,module_code,module_title) values
  (5, 600, 90, 4,5,1,'DES104','Creative Technology');

-- No-lecturer session (lecturer_id NULL) to demonstrate unassigned flag.
insert into public.tt_sessions (day_of_week,start_min,duration_min,room_id,cohort_id,lecturer_id,module_code,module_title) values
  (1, 840,120, 5,1,null,'CS105','Elective Module');
