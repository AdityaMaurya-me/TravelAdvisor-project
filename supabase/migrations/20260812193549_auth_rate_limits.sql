-- Shared, server-only throttling for authentication endpoints. The key is a
-- SHA-256 digest created by the Next.js server, never an email address.
create schema if not exists private;
revoke all on schema private from public;

create table if not exists private.auth_rate_limits (
  key_hash text primary key,
  failures integer not null default 0 check (failures >= 0),
  window_started_at timestamptz not null default now(),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

revoke all on table private.auth_rate_limits from anon, authenticated, public;

-- RPC functions must live in the exposed `public` schema for PostgREST to
-- reach them. EXECUTE is revoked from PUBLIC and granted only to service_role.
create or replace function public.auth_rate_limit_check(
  p_key_hash text,
  p_window_seconds integer default 900,
  p_captcha_after integer default 3
)
returns table (allowed boolean, captcha_required boolean, locked boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = private, pg_catalog
as $$
declare
  current_limit private.auth_rate_limits%rowtype;
  now_at timestamptz := now();
begin
  select * into current_limit from private.auth_rate_limits where key_hash = p_key_hash for update;
  if not found then
    return query select true, false, false, 0;
    return;
  end if;

  if current_limit.window_started_at < now_at - make_interval(secs => p_window_seconds) then
    update private.auth_rate_limits
      set failures = 0, window_started_at = now_at, locked_until = null, updated_at = now_at
      where key_hash = p_key_hash;
    return query select true, false, false, 0;
    return;
  end if;

  if current_limit.locked_until is not null and current_limit.locked_until > now_at then
    return query select false, true, true, ceil(extract(epoch from current_limit.locked_until - now_at))::integer;
    return;
  end if;

  return query select true, current_limit.failures >= p_captcha_after, false, 0;
end;
$$;

create or replace function public.auth_rate_limit_record_failure(
  p_key_hash text,
  p_window_seconds integer default 900,
  p_max_failures integer default 5,
  p_lockout_seconds integer default 900,
  p_captcha_after integer default 3
)
returns table (captcha_required boolean, locked boolean)
language plpgsql
security definer
set search_path = private, pg_catalog
as $$
declare
  current_limit private.auth_rate_limits%rowtype;
  now_at timestamptz := now();
  next_failures integer;
  next_locked_until timestamptz;
begin
  insert into private.auth_rate_limits (key_hash, failures, window_started_at, updated_at)
  values (p_key_hash, 0, now_at, now_at)
  on conflict (key_hash) do nothing;

  select * into current_limit from private.auth_rate_limits where key_hash = p_key_hash for update;
  next_failures := case
    when current_limit.window_started_at < now_at - make_interval(secs => p_window_seconds) then 1
    else current_limit.failures + 1
  end;
  next_locked_until := case
    when next_failures >= p_max_failures then now_at + make_interval(secs => p_lockout_seconds)
    else null
  end;

  update private.auth_rate_limits
    set failures = next_failures,
        window_started_at = case when current_limit.window_started_at < now_at - make_interval(secs => p_window_seconds) then now_at else current_limit.window_started_at end,
        locked_until = next_locked_until,
        updated_at = now_at
    where key_hash = p_key_hash;

  return query select next_failures >= p_captcha_after, next_locked_until is not null;
end;
$$;

create or replace function public.auth_rate_limit_clear(p_key_hash text)
returns void
language sql
security definer
set search_path = private, pg_catalog
as $$ delete from private.auth_rate_limits where key_hash = p_key_hash; $$;

revoke all on function public.auth_rate_limit_check(text, integer, integer) from public;
revoke all on function public.auth_rate_limit_record_failure(text, integer, integer, integer, integer) from public;
revoke all on function public.auth_rate_limit_clear(text) from public;
grant execute on function public.auth_rate_limit_check(text, integer, integer) to service_role;
grant execute on function public.auth_rate_limit_record_failure(text, integer, integer, integer, integer) to service_role;
grant execute on function public.auth_rate_limit_clear(text) to service_role;
