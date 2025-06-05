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


create policy "Unified profile update"
  on public.profiles for update
  to authenticated, service_role
  using (
    ((select auth.uid()) = id)
    or (select auth.role()) = 'service_role'
    or is_admin()
  )
  with check (
    (
      (select auth.uid()) = id and role = profiles.role
    )
    or ((select auth.role()) = 'service_role')
    or is_admin()
  );


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





-- create type permission_role as enum ('', 'r', 'rw', 'rwd');
-- create type platform_name as enum ('10X Xenium', '10X Visium', '10X Visium HD', 'H&E', 'IHC', 'NanoString GeoMx', 'Curio Bioscience Slide-seq', 'NanoString CosMx', 'Vizgen MERSCOPE', 'Unknown');
-- create type layer_metadata_type as enum('categorical', 'continuous');
-- create type directory_entity_type as enum('directory', 'experiment');


-- create table public.directory_entities (
-- --   id uuid primary key default gen_random_uuid(),
-- --   created_by uuid references auth.users(id) on delete restrict,
-- --   created_at timestamp with time zone default now(),
-- --   name text not null
--     id uuid primary key default gen_random_uuid(),
--     created_by uuid references auth.users(id) on delete restrict,
--     created_at timestamp with time zone default now(),
--     name text not null,
--     parent_id uuid references public.directory_entities(id) on delete set null,
--     entity_type directory_entity_type not null,
--     permission permission_role not null default 'r',
--     authenticated_users_read uuid[] default '{}',
--     authenticated_users_write uuid[] default '{}',
--     authenticated_users_delete uuid[] default '{}'
-- );
-- alter table public.directory_entities enable row level security;



-- -- create policy "read access "
-- --   on public.directory_entities for select
-- --   to authenticated, service_role
-- --   using (true);

-- create policy "allow all inserts"
-- on public.directory_entities for insert
-- with check (true);

-- -- create type permission_role as enum ('', 'r', 'rw', 'rwd');
-- -- create type platform_name as enum ('10X Xenium', '10X Visium', '10X Visium HD', 'H&E', 'IHC', 'NanoString GeoMx', 'Curio Bioscience Slide-seq', 'NanoString CosMx', 'Vizgen MERSCOPE', 'Unknown');
-- -- create type layer_metadata_type as enum('categorical', 'continuous');
-- -- create type directory_entity_type as enum('directory', 'experiment');

-- -- create table public.directories (
-- --   id uuid primary key default gen_random_uuid(),
-- --   created_by uuid references auth.users(id) on delete restrict,
-- --   created_at timestamp with time zone default now(),
-- --   name text not null,
-- --   parent_id uuid references public.directories(id) on delete set null,
-- --   entity_type directory_entity_type not null,
-- --   permission permission_role not null default 'r',
-- --   authenticated_users_read uuid[] default '{}',
-- --   authenticated_users_write uuid[] default '{}',
-- --   authenticated_users_delete uuid[] default '{}'
-- -- );
-- -- create index directories_created_by_idx on public.directories (created_by);
-- -- create index directories_parent_id_idx on public.directories (parent_id);

-- -- alter table public.directories enable row level security;

-- -- create policy "allow all inserts"
-- -- on public.directories for insert
-- -- with check (true);

