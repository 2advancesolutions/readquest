-- =====================================================================
-- ReadQuest — Run this in the Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query → paste → Run)
-- These are all SAFE — they won't delete existing data.
-- =====================================================================

-- 1. XP Ledger
create table if not exists xp_ledger (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  amount integer not null,
  reason varchar(100) not null,
  earned_at timestamptz default now()
);

-- 2. Streaks (one row per student per day they read)
create table if not exists streaks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  active_date date not null
);

-- 3. Badges catalog
create table if not exists badges (
  id uuid primary key default gen_random_uuid(),
  slug varchar(50) unique not null,
  name varchar(100) not null,
  icon varchar(10) not null,
  description text not null,
  criteria jsonb default '{}'
);

-- 4. Student → Badge junction
create table if not exists student_badges (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  badge_id uuid references badges(id) on delete cascade,
  earned_at timestamptz default now()
);

-- 5. Reading progress (resume + completion tracking)
create table if not exists reading_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  story_id uuid references stories(id) on delete cascade,
  last_page integer default 0,
  total_pages integer default 0,
  completed_at timestamptz,
  updated_at timestamptz default now(),
  unique(student_id, story_id)
);

-- 6. Reading logs (completed session records)
create table if not exists reading_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  story_id uuid references stories(id) on delete cascade,
  story_title varchar(255),
  grade_level integer,
  cover_url text,
  student_name varchar(100),
  reading_accuracy integer default 0,
  quiz_score integer default 0,
  quiz_total integer default 0,
  comprehension_score integer default 0,
  total_xp integer default 0,
  stars integer default 0,
  feedback text,
  completed_at timestamptz default now()
);

-- Indexes for fast student-scoped lookups
create index if not exists idx_reading_logs_student_id on reading_logs(student_id);
create index if not exists idx_reading_logs_story_id on reading_logs(story_id);
create index if not exists idx_reading_progress_student_id on reading_progress(student_id);

-- ── Seed the 8 core badges (idempotent — skips existing slugs) ────────────────
insert into badges (slug, name, icon, description, criteria)
values
  ('first_book',   'First Book!',    '📖', 'Read your first book',              '{"stories_read":1}'),
  ('streak_3',     '3-Day Streak',   '🔥', 'Read 3 days in a row',              '{"streak_days":3}'),
  ('quiz_master',  'Quiz Master',    '🧠', 'Get 5 quiz questions right',        '{"quiz_correct":5}'),
  ('speed_reader', 'Speed Reader',   '⚡', 'Read a book in under 10 minutes',   '{"speed_minutes":10}'),
  ('streak_7',     '7-Day Streak',   '🏆', 'Read 7 days in a row',              '{"streak_days":7}'),
  ('explorer',     'Genre Explorer', '🗺️', 'Read books in 3 different themes',  '{"unique_themes":3}'),
  ('bookworm',     'Bookworm',       '🐛', 'Complete 5 books',                  '{"stories_read":5}'),
  ('word_wizard',  'Word Wizard',    '🔮', 'Reach level 3',                     '{"level":3}')
on conflict (slug) do nothing;

-- ── Verify ────────────────────────────────────────────────────────────────────
select 'badges' as table_name, count(*) as rows from badges
union all
select 'xp_ledger',       count(*) from xp_ledger
union all
select 'streaks',         count(*) from streaks
union all
select 'reading_progress',count(*) from reading_progress;
