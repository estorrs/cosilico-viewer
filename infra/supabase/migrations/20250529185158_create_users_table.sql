create type user_role as enum ('user', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  role user_role not null default 'user'
);

alter table public.profiles enable row level security;

create or replace function is_admin()
returns boolean
set search_path = ''
security definer
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

create policy "Unified profile read access"
  on public.profiles for select
  to authenticated, service_role
  using (
    (select auth.uid()) = id
    or (select auth.role()) = 'service_role'
    or is_admin()
  );


create policy "Users can update their own profile (excluding role)"
on public.profiles for update
to authenticated
using (
  auth.uid() = id
)
with check (
  auth.uid() = id
  and role = 'user'  -- ✅ enforce that role must remain unchanged
);


create policy "Admins and service_role can update any profile"
on public.profiles for update
to authenticated, service_role
using (
  is_admin() or (select auth.role()) = 'service_role'
)
with check (
  true  -- allow all changes
);




-- create policy "Unified profile update"
--   on public.profiles for update
--   to authenticated, service_role
--   using (
--     ((select auth.uid()) = id)
--     or (select auth.role()) = 'service_role'
--     or is_admin()
--   )
--   with check (
--     (
--       (select auth.uid()) = id and role = profiles.role
--     )
--     or ((select auth.role()) = 'service_role')
--     or is_admin()
--   );


create policy "Admins and service_role can delete any profile"
  on public.profiles for delete
  to authenticated, service_role
  using (
    (select auth.role()) = 'service_role'
    or is_admin()
  );


create or replace function public.handle_new_user()
returns trigger
set search_path = ''
language plpgsql
security definer
as $$
declare
  name text;
begin
  name := new.raw_user_meta_data->>'name';

  insert into public.profiles (id, name, role)
  values (new.id, name, 'user');

  return new;
end;
$$;


create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();


