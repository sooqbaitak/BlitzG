-- BLITZ Gaming V2 migration: video storage + tracking rate limits.
-- Run in Supabase SQL Editor before deploying the updated website.

-- Public product-ad videos. Only authenticated admins may add, update or remove files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('store-videos', 'store-videos', true, 104857600,
  array['video/mp4','video/webm','video/quicktime']::text[])
on conflict (id) do update set
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = array['video/mp4','video/webm','video/quicktime']::text[];

drop policy if exists "Public reads BLITZ store videos" on storage.objects;
create policy "Public reads BLITZ store videos" on storage.objects
  for select to anon, authenticated using (bucket_id = 'store-videos');
drop policy if exists "Admins upload BLITZ store videos" on storage.objects;
create policy "Admins upload BLITZ store videos" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'store-videos' and ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' or coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb) ? 'admin')
  );
drop policy if exists "Admins update BLITZ store videos" on storage.objects;
create policy "Admins update BLITZ store videos" on storage.objects
  for update to authenticated using (
    bucket_id = 'store-videos' and ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' or coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb) ? 'admin')
  ) with check (
    bucket_id = 'store-videos' and ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' or coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb) ? 'admin')
  );
drop policy if exists "Admins delete BLITZ store videos" on storage.objects;
create policy "Admins delete BLITZ store videos" on storage.objects
  for delete to authenticated using (
    bucket_id = 'store-videos' and ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' or coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb) ? 'admin')
  );

-- Durable public order-tracking rate limits. Hashed keys only; no IP or phone is stored.
create table if not exists public.blitz_public_rate_limits (
  rate_key text primary key,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0),
  blocked_until timestamptz
);
create index if not exists blitz_public_rate_limits_window_idx on public.blitz_public_rate_limits(window_started_at);
alter table public.blitz_public_rate_limits enable row level security;
revoke all on public.blitz_public_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.blitz_public_rate_limits to service_role;

create or replace function public.blitz_consume_public_rate_limit(
  p_key_hash text,
  p_limit integer default 6,
  p_window_seconds integer default 600,
  p_lock_seconds integer default 900
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_row public.blitz_public_rate_limits%rowtype;
begin
  if p_key_hash is null or length(p_key_hash) <> 64 then raise exception 'Invalid rate-limit key.'; end if;
  perform pg_advisory_xact_lock(hashtext(p_key_hash));
  select * into v_row from public.blitz_public_rate_limits where rate_key = p_key_hash for update;
  if not found then
    insert into public.blitz_public_rate_limits(rate_key, window_started_at, attempts) values (p_key_hash, v_now, 1);
    return true;
  end if;
  if v_row.blocked_until is not null and v_row.blocked_until > v_now then return false; end if;
  if v_row.window_started_at + make_interval(secs => greatest(1, p_window_seconds)) <= v_now then
    update public.blitz_public_rate_limits set window_started_at = v_now, attempts = 1, blocked_until = null where rate_key = p_key_hash;
    return true;
  end if;
  if v_row.attempts >= greatest(1, p_limit) then
    update public.blitz_public_rate_limits set blocked_until = v_now + make_interval(secs => greatest(1, p_lock_seconds)) where rate_key = p_key_hash;
    return false;
  end if;
  update public.blitz_public_rate_limits set attempts = attempts + 1 where rate_key = p_key_hash;
  return true;
end;
$$;
revoke all on function public.blitz_consume_public_rate_limit(text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.blitz_consume_public_rate_limit(text, integer, integer, integer) to service_role;

