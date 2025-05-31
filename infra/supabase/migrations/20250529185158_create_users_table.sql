create type user_role as enum ('user', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  role user_role not null default 'user'
);

alter table public.profiles enable row level security;

create policy "Users can select their own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- create policy "Users can update their own profile (excluding role)"
--   on public.profiles for update
--   using (auth.uid() = id)
--   with check (auth.uid() = id and role = old.role);

create policy "Users can update their own profile (excluding role)"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = profiles.role);

create policy "Admins and service_role can read any profile"
  on public.profiles for select
  to authenticated, service_role
  using (
    auth.role() = 'service_role'
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins and service_role can update any profile"
  on public.profiles for update
  to authenticated, service_role
  using (
    auth.role() = 'service_role'
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins and service_role can delete any profile"
  on public.profiles for delete
  to authenticated, service_role
  using (
    auth.role() = 'service_role'
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );


create function public.handle_new_user()
returns trigger as $$
declare
  name text;
begin
  name := new.raw_user_meta_data->>'name';

  insert into public.profiles (id, name, role)
  values (new.id, name, 'user');

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
