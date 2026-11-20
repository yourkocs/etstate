-- 부동산광장 Supabase 설정 (SQL Editor에 통째로 붙여 넣고 Run 한 번)
-- 다시 실행해도 안전합니다.

-- 1. 로그인 허용 이메일 (관리자가 화면에서 추가·삭제)
create table if not exists public.allowed_emails (
  email text primary key,
  admin boolean not null default false,
  added_at timestamptz not null default now()
);

-- 2. 모든 데이터를 담는 문서 표 (경로 = props/아이디, recs/아이디, members/아이디 ...)
create table if not exists public.docs (
  path text primary key,
  coll text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists docs_coll_idx on public.docs (coll);
alter table public.docs replica identity full;

-- 3. 권한 확인 함수
create or replace function public.my_email() returns text
language sql stable as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.allowed_emails where email = public.my_email())
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.allowed_emails where email = public.my_email() and admin)
$$;

-- 처음 로그인한 사람이 관리자가 되고, 이후에는 허용 여부만 알려 줍니다.
create or replace function public.plaza_access() returns jsonb
language plpgsql security definer set search_path = public as $$
declare e text := public.my_email();
begin
  if auth.uid() is null or e = '' then
    return jsonb_build_object('member', false, 'admin', false);
  end if;
  if not exists (select 1 from public.allowed_emails) then
    insert into public.allowed_emails (email, admin) values (e, true);
  end if;
  return jsonb_build_object('member', public.is_member(), 'admin', public.is_admin(), 'email', e, 'uid', auth.uid());
end $$;

-- 4. 행 단위 보안: 허용된 멤버만 읽고 씀
alter table public.docs enable row level security;
alter table public.allowed_emails enable row level security;

drop policy if exists docs_member_all on public.docs;
create policy docs_member_all on public.docs for all to authenticated
  using (public.is_member()) with check (public.is_member());

drop policy if exists allow_read on public.allowed_emails;
create policy allow_read on public.allowed_emails for select to authenticated using (public.is_member());
drop policy if exists allow_admin_ins on public.allowed_emails;
create policy allow_admin_ins on public.allowed_emails for insert to authenticated with check (public.is_admin());
drop policy if exists allow_admin_del on public.allowed_emails;
create policy allow_admin_del on public.allowed_emails for delete to authenticated using (public.is_admin() and email <> public.my_email());

-- 5. 깊은 병합 업데이트 (체크 하나만 바꿔도 다른 체크가 지워지지 않게)
create or replace function public.jsonb_deep_merge(a jsonb, b jsonb) returns jsonb
language sql immutable as $$
  select case
    when jsonb_typeof(a) = 'object' and jsonb_typeof(b) = 'object' then (
      select coalesce(jsonb_object_agg(k,
        case when a ? k and b ? k then public.jsonb_deep_merge(a -> k, b -> k)
             when b ? k then b -> k else a -> k end), '{}'::jsonb)
      from (select jsonb_object_keys(a) k union select jsonb_object_keys(b)) s)
    else b end
$$;

create or replace function public.doc_merge(p text, patch jsonb) returns void
language sql security invoker set search_path = public as $$
  insert into public.docs (path, coll, data, updated_at)
  values (p, regexp_replace(p, '/[^/]*$', ''), patch, now())
  on conflict (path) do update
    set data = public.jsonb_deep_merge(public.docs.data, excluded.data), updated_at = now()
$$;

-- 6. 기존 데이터 옮기기용 일회성 입력 함수 (Claude가 사용, 14일 뒤 자동 만료)
create table if not exists public.import_keys (hash text primary key, expires_at timestamptz not null);
alter table public.import_keys enable row level security;
insert into public.import_keys values
  ('853c33f94a6de6e743919e6d6f76d073af8276d0eefedfcef7667b3f1ecf512f', now() + interval '14 days')
  on conflict (hash) do nothing;

create or replace function public.claude_import(tok text, rows jsonb) returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare n integer;
begin
  if not exists (select 1 from public.import_keys
                 where hash = encode(extensions.digest(tok, 'sha256'), 'hex') and expires_at > now()) then
    raise exception 'invalid key';
  end if;
  insert into public.docs (path, coll, data, updated_at)
  select r ->> 'path', regexp_replace(r ->> 'path', '/[^/]*$', ''), r -> 'data', now()
  from jsonb_array_elements(rows) r
  on conflict (path) do update set data = excluded.data, updated_at = now();
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.claude_import(text, jsonb) from public;
grant execute on function public.claude_import(text, jsonb) to anon, authenticated;

-- 7. 실시간 반영
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;
