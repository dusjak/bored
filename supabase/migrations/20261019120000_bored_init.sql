-- BORED. backup schema.
-- The phone keeps the source of truth in SQLite. These tables are the signed-in copy.
-- Device-only fields (notification id, backgrounded_at, splash-seen) are not stored here.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  -- Epoch so the first client write wins last-write-wins against this empty row.
  updated_at timestamptz not null default '1970-01-01T00:00:00Z',
  deleted_at timestamptz
);

create table public.sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  chosen_duration_seconds integer not null check (chosen_duration_seconds >= 0),
  actual_duration_seconds integer not null check (actual_duration_seconds >= 0),
  status text not null check (status in ('active', 'completed', 'aborted')),
  aborted boolean generated always as (status = 'aborted') stored,
  started_at timestamptz not null,
  ended_at timestamptz,
  mood text check (mood is null or mood in ('restless', 'neutral', 'calm', 'clear', 'deep')),
  note text not null default '',
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table public.settings (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  value text not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  primary key (user_id, key)
);

create index sessions_user_updated_idx on public.sessions (user_id, updated_at);
create index settings_user_updated_idx on public.settings (user_id, updated_at);

alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.settings enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.sessions from anon, authenticated;
revoke all on table public.settings from anon, authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.sessions to authenticated;
grant select, insert, update on table public.settings to authenticated;

-- Anonymous sign-in still uses the authenticated role. There is no separate read path.
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy sessions_select_own on public.sessions
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy sessions_insert_own on public.sessions
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy sessions_update_own on public.sessions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy settings_select_own on public.settings
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy settings_insert_own on public.settings
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy settings_update_own on public.settings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, created_at, updated_at)
  values (new.id, null, now(), '1970-01-01T00:00:00Z')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Stale writes lose. A repeated upsert of the same stamp is a no-op success.
create or replace function public.upsert_session(
  p_id uuid,
  p_chosen_duration_seconds integer,
  p_actual_duration_seconds integer,
  p_status text,
  p_started_at timestamptz,
  p_ended_at timestamptz,
  p_mood text,
  p_note text,
  p_created_at timestamptz,
  p_updated_at timestamptz,
  p_deleted_at timestamptz
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_status not in ('active', 'completed', 'aborted') then
    raise exception 'bad session status';
  end if;

  insert into public.sessions (
    id, user_id, chosen_duration_seconds, actual_duration_seconds, status,
    started_at, ended_at, mood, note, created_at, updated_at, deleted_at
  ) values (
    p_id, auth.uid(), p_chosen_duration_seconds, p_actual_duration_seconds, p_status,
    p_started_at, p_ended_at, p_mood, coalesce(p_note, ''), p_created_at, p_updated_at, p_deleted_at
  )
  on conflict (id) do update set
    chosen_duration_seconds = excluded.chosen_duration_seconds,
    actual_duration_seconds = excluded.actual_duration_seconds,
    status = excluded.status,
    started_at = excluded.started_at,
    ended_at = excluded.ended_at,
    mood = excluded.mood,
    note = excluded.note,
    updated_at = excluded.updated_at,
    deleted_at = excluded.deleted_at
  where public.sessions.user_id = (select auth.uid())
    and public.sessions.updated_at <= excluded.updated_at;
end;
$$;

create or replace function public.upsert_setting(
  p_key text,
  p_value text,
  p_updated_at timestamptz,
  p_deleted_at timestamptz
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_key is null or length(trim(p_key)) = 0 then
    raise exception 'bad setting key';
  end if;

  insert into public.settings (user_id, key, value, updated_at, deleted_at)
  values (auth.uid(), p_key, p_value, p_updated_at, p_deleted_at)
  on conflict (user_id, key) do update set
    value = excluded.value,
    updated_at = excluded.updated_at,
    deleted_at = excluded.deleted_at
  where public.settings.updated_at <= excluded.updated_at;
end;
$$;

create or replace function public.upsert_profile(
  p_display_name text,
  p_updated_at timestamptz
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.profiles (id, display_name, created_at, updated_at)
  values (auth.uid(), nullif(trim(p_display_name), ''), p_updated_at, p_updated_at)
  on conflict (id) do update set
    display_name = excluded.display_name,
    updated_at = excluded.updated_at
  where public.profiles.updated_at <= excluded.updated_at;
end;
$$;

revoke all on function public.upsert_session(uuid, integer, integer, text, timestamptz, timestamptz, text, text, timestamptz, timestamptz, timestamptz) from public, anon;
revoke all on function public.upsert_setting(text, text, timestamptz, timestamptz) from public, anon;
revoke all on function public.upsert_profile(text, timestamptz) from public, anon;

grant execute on function public.upsert_session(uuid, integer, integer, text, timestamptz, timestamptz, text, text, timestamptz, timestamptz, timestamptz) to authenticated;
grant execute on function public.upsert_setting(text, text, timestamptz, timestamptz) to authenticated;
grant execute on function public.upsert_profile(text, timestamptz) to authenticated;
