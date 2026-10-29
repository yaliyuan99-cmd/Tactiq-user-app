-- Tactiq: account-scoped storage.
--
-- Every table here holds one person's own records and nobody else's. Row level
-- security is enabled on all of them with no exceptions and no service-role
-- carve-out, so a row is reachable only by the account that owns it. The app
-- talks to this database with the anon key and the signed-in user's JWT; there
-- is no server of ours in between that could widen that.
--
-- Shape follows the client's domain model rather than being invented here, so
-- that a mirror of the local store is a row-for-row mapping. The enumerated
-- values in the CHECK constraints are copied from TypeScript and must be kept
-- in step with it:
--
--   contact keys      src/domain/contacts.ts  CONTACT_KEYS
--   command tokens    src/domain/commands.ts  COMMAND_TOKENS
--   shortcut actions  src/domain/commands.ts  SHORTCUT_ACTION_IDS
--   lesson ids        src/domain/lessons.ts   LESSON_IDS
--   outcomes, kinds,  src/domain/models.ts    GestureOutcome, GESTURE_EVENT_KINDS,
--   evidence, source,                         RECORD_EVIDENCE, GestureEventSource,
--   mode, hands                               GestureEventMode, HANDS
--
-- src/services/supabase/schema.test.ts reads this file and fails if the lists
-- drift apart, so the database cannot quietly accept a value the app does not
-- recognise, or reject one it produces.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.touch_updated_at is
  'Keeps updated_at honest: set by the database on every update, not by the client.';

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'One row per account. The email address is not duplicated here: auth.users already holds it, and a second copy is a second thing to keep correct and a second thing to leak.';

-- ---------------------------------------------------------------------------
-- preferences
--
-- Only the half of UserPreferences that describes the person. Appearance
-- (theme, text size, contrast, reduced motion) describes the screen in front of
-- you and deliberately stays device-wide in the browser, never synced: a phone
-- should not inherit a laptop's theme.
-- ---------------------------------------------------------------------------

create table public.preferences (
  user_id                 uuid primary key references auth.users (id) on delete cascade,
  audio_announcements     boolean not null default false,
  visual_confirmation     boolean not null default true,
  haptic_feedback         boolean not null default true,
  longer_interaction_time boolean not null default false,
  hand                    text not null default 'right' check (hand in ('left', 'right')),
  onboarding_completed    boolean not null default false,
  onboarding_step         smallint not null default 0 check (onboarding_step between 0 and 3),
  updated_at              timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- gesture_events
--
-- One row per attempt. `id` is the id the client generated, so re-sending a
-- record is an upsert rather than a duplicate: a sync that is interrupted and
-- retried converges instead of multiplying. The primary key is (user_id, id)
-- so two accounts can never collide even if their id generators do.
-- ---------------------------------------------------------------------------

create table public.gesture_events (
  user_id          uuid not null references auth.users (id) on delete cascade,
  id               text not null check (char_length(id) between 1 and 64),
  at               timestamptz not null,
  source           text not null check (source in ('simulator', 'training', 'calibration', 'device')),
  mode             text not null check (mode in ('guided', 'free', 'lesson', 'calibration', 'device')),
  kind             text not null default 'command' check (kind in ('command', 'activation')),
  target_contact   text check (target_contact in ('index_tip', 'index_base', 'middle_tip', 'middle_base', 'ring_tip', 'ring_base', 'pinky_tip', 'pinky_base')),
  detected_contact text check (detected_contact in ('index_tip', 'index_base', 'middle_tip', 'middle_base', 'ring_tip', 'ring_base', 'pinky_tip', 'pinky_base')),
  target_token     text check (target_token in ('confirm', 'back', 'undo', 'next', 'read', 'previous', 'quick_action_1', 'quick_action_2', 'emergency')),
  token            text check (token in ('confirm', 'back', 'undo', 'next', 'read', 'previous', 'quick_action_1', 'quick_action_2', 'emergency')),
  duration_ms      integer check (duration_ms >= 0 and duration_ms <= 600000),
  outcome          text not null check (outcome in ('recognised', 'mismatch', 'rejected_duration', 'window_closed', 'emergency', 'emergency_cancelled')),
  evidence         text not null check (evidence in ('simulated', 'measured')),
  seeded           boolean not null default false,
  lesson_id        text check (lesson_id in ('squeeze_to_activate', 'confirm_and_back', 'next_previous_read', 'undo_and_shortcuts', 'emergency_hold')),
  created_at       timestamptz not null default now(),
  primary key (user_id, id)
);

comment on column public.gesture_events.evidence is
  'simulated or measured. Nothing in this app is validated performance, and a row can never claim to be.';
comment on column public.gesture_events.seeded is
  'True for the Demo Mode sample records. Keeps generated samples distinguishable from anything a person actually did.';

-- Newest first, per account, which is how every screen reads it.
create index gesture_events_user_at_idx on public.gesture_events (user_id, at desc);
-- Supports the lesson and activation filters without scanning the account.
create index gesture_events_user_lesson_idx on public.gesture_events (user_id, lesson_id) where lesson_id is not null;

-- ---------------------------------------------------------------------------
-- calibration
--
-- One profile per account: starting calibration replaces the previous attempt,
-- exactly as the local service does. Samples are rows rather than a JSON blob
-- so that what is stored about a person is visible in the schema and can be
-- counted, inspected and deleted on its own terms.
-- ---------------------------------------------------------------------------

create table public.calibration_profiles (
  user_id                     uuid primary key references auth.users (id) on delete cascade,
  id                          text not null check (char_length(id) between 1 and 64),
  hand                        text not null check (hand in ('left', 'right')),
  status                      text not null check (status in ('not_started', 'in_progress', 'incomplete', 'complete')),
  started_at                  timestamptz not null,
  completed_at                timestamptz,
  samples_required_per_contact smallint not null check (samples_required_per_contact between 1 and 20),
  evidence                    text not null check (evidence in ('simulated', 'measured')),
  device_id                   text check (char_length(device_id) <= 128),
  updated_at                  timestamptz not null default now()
);

create table public.calibration_samples (
  user_id          uuid not null references auth.users (id) on delete cascade,
  ordinal          integer not null check (ordinal >= 0),
  contact          text not null check (contact in ('index_tip', 'index_base', 'middle_tip', 'middle_base', 'ring_tip', 'ring_base', 'pinky_tip', 'pinky_base')),
  recorded_at      timestamptz not null,
  duration_ms      integer not null check (duration_ms >= 0 and duration_ms <= 600000),
  detected_contact text check (detected_contact in ('index_tip', 'index_base', 'middle_tip', 'middle_base', 'ring_tip', 'ring_base', 'pinky_tip', 'pinky_base')),
  accepted         boolean not null,
  reason           text check (reason in ('wrong_contact', 'too_long', 'no_contact')),
  primary key (user_id, ordinal),
  foreign key (user_id) references public.calibration_profiles (user_id) on delete cascade
);

comment on table public.calibration_samples is
  'Ordinal is the sample''s position in the profile, so the stored order is the order they were taken. Replacing a calibration deletes these rows and writes the new set.';

-- ---------------------------------------------------------------------------
-- lesson_progress
-- ---------------------------------------------------------------------------

create table public.lesson_progress (
  user_id        uuid not null references auth.users (id) on delete cascade,
  lesson_id      text not null check (lesson_id in ('squeeze_to_activate', 'confirm_and_back', 'next_previous_read', 'undo_and_shortcuts', 'emergency_hold')),
  status         text not null check (status in ('not_started', 'in_progress', 'complete')),
  attempts       integer not null default 0 check (attempts >= 0),
  correct        integer not null default 0 check (correct >= 0 and correct <= attempts),
  best_accuracy  real check (best_accuracy >= 0 and best_accuracy <= 1),
  last_accuracy  real check (last_accuracy >= 0 and last_accuracy <= 1),
  last_attempt_at timestamptz,
  completed_at   timestamptz,
  runs           integer not null default 0 check (runs >= 0),
  run_attempts   integer not null default 0 check (run_attempts >= 0),
  run_correct    integer not null default 0 check (run_correct >= 0 and run_correct <= run_attempts),
  updated_at     timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- ---------------------------------------------------------------------------
-- command_mappings
--
-- Only the two shortcut slots are storable. The other seven commands are fixed
-- and Emergency is never remappable, so the schema does not provide anywhere to
-- put a different answer: the rule is enforced here as well as in the client,
-- because a client-side rule is not a rule.
-- ---------------------------------------------------------------------------

create table public.command_mappings (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  shortcut_1 text not null default 'play_pause' check (shortcut_1 in ('unassigned', 'play_pause', 'announce_time', 'read_notifications', 'open_assistant', 'toggle_flashlight', 'announce_phone_battery', 'start_voice_memo')),
  shortcut_2 text not null default 'announce_time' check (shortcut_2 in ('unassigned', 'play_pause', 'announce_time', 'read_notifications', 'open_assistant', 'toggle_flashlight', 'announce_phone_battery', 'start_voice_memo')),
  updated_at timestamptz not null default now()
);

comment on table public.command_mappings is
  'The two assignable slots, holding the phone action each one triggers. There is nowhere to put a command token: the other seven commands are fixed and Emergency is never remappable, so a row cannot express a mapping the client would refuse.';

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create trigger profiles_touch         before update on public.profiles         for each row execute function public.touch_updated_at();
create trigger preferences_touch      before update on public.preferences      for each row execute function public.touch_updated_at();
create trigger calibration_touch      before update on public.calibration_profiles for each row execute function public.touch_updated_at();
create trigger lesson_progress_touch  before update on public.lesson_progress  for each row execute function public.touch_updated_at();
create trigger command_mappings_touch before update on public.command_mappings for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security
--
-- Enabled on every table, with one policy per operation rather than a single
-- `for all`, so that what each operation permits is written down separately and
-- a later change to one cannot silently widen the others.
--
-- `(select auth.uid())` rather than a bare `auth.uid()`: the subselect is
-- evaluated once per statement instead of once per row.
--
-- The insert policies repeat the ownership check in `with check`, which is what
-- stops an account inserting a row under someone else's user_id. A `using`
-- clause alone would not: it filters what is visible, not what may be written.
-- ---------------------------------------------------------------------------

alter table public.profiles             enable row level security;
alter table public.preferences          enable row level security;
alter table public.gesture_events       enable row level security;
alter table public.calibration_profiles enable row level security;
alter table public.calibration_samples  enable row level security;
alter table public.lesson_progress      enable row level security;
alter table public.command_mappings     enable row level security;

-- profiles keys on id rather than user_id; everything else keys on user_id.
create policy "profiles are readable by their owner"   on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles are created by their owner"    on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles are updated by their owner"    on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profiles are deleted by their owner"    on public.profiles for delete to authenticated using ((select auth.uid()) = id);

create policy "preferences are readable by their owner" on public.preferences for select to authenticated using ((select auth.uid()) = user_id);
create policy "preferences are created by their owner"  on public.preferences for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "preferences are updated by their owner"  on public.preferences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "preferences are deleted by their owner"  on public.preferences for delete to authenticated using ((select auth.uid()) = user_id);

create policy "events are readable by their owner" on public.gesture_events for select to authenticated using ((select auth.uid()) = user_id);
create policy "events are created by their owner"  on public.gesture_events for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "events are updated by their owner"  on public.gesture_events for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "events are deleted by their owner"  on public.gesture_events for delete to authenticated using ((select auth.uid()) = user_id);

create policy "calibration is readable by its owner" on public.calibration_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "calibration is created by its owner"  on public.calibration_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "calibration is updated by its owner"  on public.calibration_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "calibration is deleted by its owner"  on public.calibration_profiles for delete to authenticated using ((select auth.uid()) = user_id);

create policy "samples are readable by their owner" on public.calibration_samples for select to authenticated using ((select auth.uid()) = user_id);
create policy "samples are created by their owner"  on public.calibration_samples for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "samples are updated by their owner"  on public.calibration_samples for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "samples are deleted by their owner"  on public.calibration_samples for delete to authenticated using ((select auth.uid()) = user_id);

create policy "lesson progress is readable by its owner" on public.lesson_progress for select to authenticated using ((select auth.uid()) = user_id);
create policy "lesson progress is created by its owner"  on public.lesson_progress for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "lesson progress is updated by its owner"  on public.lesson_progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "lesson progress is deleted by its owner"  on public.lesson_progress for delete to authenticated using ((select auth.uid()) = user_id);

create policy "shortcuts are readable by their owner" on public.command_mappings for select to authenticated using ((select auth.uid()) = user_id);
create policy "shortcuts are created by their owner"  on public.command_mappings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "shortcuts are updated by their owner"  on public.command_mappings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "shortcuts are deleted by their owner"  on public.command_mappings for delete to authenticated using ((select auth.uid()) = user_id);

-- Nothing is granted to `anon`. An unauthenticated request reaches no row of
-- any of these tables, and the policies above are all scoped `to authenticated`
-- so they cannot be satisfied by one either.

-- ---------------------------------------------------------------------------
-- A profile row for every new account
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on function public.handle_new_user is
  'security definer because it writes a public.profiles row on behalf of a user who does not exist yet when the trigger fires. search_path is pinned to nothing so the body cannot resolve an unqualified name to an attacker-created object.';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
