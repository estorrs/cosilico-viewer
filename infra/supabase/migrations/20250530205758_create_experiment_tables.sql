create type permission_role as enum ('', 'r', 'rw', 'rwd');
create type platform_name as enum ('10X Xenium', '10X Visium', '10X Visium HD', 'H&E', 'IHC', 'NanoString GeoMx', 'Curio Bioscience Slide-seq', 'NanoString CosMx', 'Vizgen MERSCOPE', 'Unknown');
create type layer_metadata_type as enum('categorical', 'continuous');
create type directory_entity_type as enum('directory', 'experiment');

create table public.directory_entities (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete restrict,
  created_at timestamp with time zone default now(),
  name text not null,
  parent_id uuid references public.directory_entities(id) on delete set null,
  entity_type directory_entity_type not null,
  permission permission_role not null default 'r',
  authenticated_users_read uuid[] default '{}',
  authenticated_users_write uuid[] default '{}',
  authenticated_users_delete uuid[] default '{}'
);
create index directories_created_by_idx on public.directory_entities (created_by);
create index directories_parent_id_idx on public.directory_entities (parent_id);



create table public.experiments (
  id uuid primary key default gen_random_uuid(),
  version text not null default 'v0.0.1',
  created_by uuid references auth.users(id) on delete restrict,
  created_at timestamp with time zone default now(),
  experiment_date timestamp with time zone,
  name text not null,
  platform platform_name not null,
  platform_version text not null default '',
  metadata jsonb,
  parent_id uuid references public.directory_entities(id) on delete cascade,
  directory_entity_id uuid references public.directory_entities(id) on delete cascade,
  image_ids uuid[] default '{}',
  layer_ids uuid[] default '{}',
  tags text[] default '{}'
);
create index experiments_created_by_idx on public.experiments (created_by);
create index experiments_parent_id_idx on public.experiments (parent_id);
create index experiments_directory_entity_id_idx on public.experiments (directory_entity_id);

create table public.images (
  id uuid primary key default gen_random_uuid(),
  version text not null default 'v0.0.1',
  created_by uuid references auth.users(id) on delete restrict,
  created_at timestamp with time zone default now(),
  experiment_id uuid references public.experiments(id) on delete cascade,
  name text not null,
  metadata jsonb,
  path text not null,
  tags text[] default '{}'
);
create index images_created_by_idx on public.images (created_by);
create index images_experiment_id_idx on public.images (experiment_id);

create table public.layers (
  id uuid primary key default gen_random_uuid(),
  version text not null default 'v0.0.1',
  created_by uuid references auth.users(id) on delete restrict,
  created_at timestamp with time zone default now(),
  experiment_id uuid references public.experiments(id) on delete cascade,
  name text not null,
  is_grouped boolean not null,
  metadata jsonb,
  path text not null,
  tags text[] default '{}'
);
create index layers_created_by_idx on public.layers (created_by);
create index layers_experiment_id_idx on public.layers (experiment_id);

create table public.layer_metadata (
  id uuid primary key default gen_random_uuid(),
  version text not null default 'v0.0.1',
  created_by uuid references auth.users(id) on delete restrict,
  created_at timestamp with time zone default now(),
  layer_id uuid references public.layers(id) on delete cascade,
  name text not null,
  metadata_type layer_metadata_type not null,
  is_sparse boolean not null,
  fields text[] default '{}',
  metadata jsonb,
  path text not null,
  tags text[] default '{}'
);
create index layer_metadata_created_by_idx on public.layer_metadata (created_by);
create index layer_metadata_layer_id_idx on public.layer_metadata (layer_id);

alter table public.experiments enable row level security;
alter table public.images enable row level security;
alter table public.layers enable row level security;
alter table public.layer_metadata enable row level security;
alter table public.directory_entities enable row level security;

create or replace function public.add_creator_to_permissions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_uid uuid;
begin
  current_uid := auth.uid();

  new.created_by := current_uid;

  new.authenticated_users_read :=
    array_append(coalesce(new.authenticated_users_read, '{}'), current_uid);

  new.authenticated_users_write :=
    array_append(coalesce(new.authenticated_users_write, '{}'), current_uid);

  new.authenticated_users_delete :=
    array_append(coalesce(new.authenticated_users_delete, '{}'), current_uid);

  return new;
end;
$$;

create trigger add_creator_permissions
before insert on public.directory_entities
for each row
execute procedure public.add_creator_to_permissions();


create or replace function public.link_experiment_to_directory_entity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_uid uuid := auth.uid();
  new_dir_id uuid;
begin
  insert into public.directory_entities (
    name,
    parent_id,
    entity_type,
    created_by
  )
  values (
    new.name,
    new.parent_id,
    'experiment',
    current_uid
  )
  returning id into new_dir_id;

  update public.experiments
  set directory_entity_id = new_dir_id
  where id = new.id;

  return new;
end;
$$;


create trigger create_directory_entity_for_experiment
after insert on public.experiments
for each row
execute procedure public.link_experiment_to_directory_entity();



create or replace function has_directory_access_combined(start_id uuid, access_type text)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  result boolean;
begin
  with recursive directory_chain as (
    -- ✅ Start at the directory with id = start_id
    select d.id, d.parent_id, d.permission,
           d.authenticated_users_read,
           d.authenticated_users_write,
           d.authenticated_users_delete
    from public.directory_entities d
    where d.id = start_id

    union all

    -- ✅ Continue walking up via parent_id
    select d.id, d.parent_id, d.permission,
           d.authenticated_users_read,
           d.authenticated_users_write,
           d.authenticated_users_delete
    from public.directory_entities d
    join directory_chain dc on d.id = dc.parent_id
  )
  select exists (
    select 1
    from directory_chain
    where
      case access_type
        when 'read' then (select auth.uid()) = any(authenticated_users_read)
                    or permission in ('r', 'rw', 'rwd')
        when 'write' then (select auth.uid()) = any(authenticated_users_write)
                    or permission in ('rw', 'rwd')
        when 'delete' then (select auth.uid()) = any(authenticated_users_delete)
                    or permission = 'rwd'
        else false
      end
  )
  into result;

  return result;
end;
$$;





create function is_admin_or_service_role()
returns boolean as $$
  select
    auth.role() = 'service_role'
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin'
    );
$$ language sql stable;





create policy "read_directory_entities"
on public.directory_entities for select
to authenticated, service_role
using (
    is_admin_or_service_role()
    or parent_id is null
    or has_directory_access_combined(parent_id, 'read')
    -- has_directory_access_combined(id, 'read')
    -- true
--   (select auth.uid()) is not null and (
--     is_admin_or_service_role()
--     or has_directory_access_combined(id, 'read')
--   )
);

create policy "insert_directory_entities"
to authenticated, service_role
on public.directory_entities for insert
with check (
    true
    -- parent_id = 'ba98eb3f84ab4ec2b7b07353d7933db4'
--   (select auth.uid()) is not null and (
--     is_admin_or_service_role()
--     -- or parent_id = 'ba98eb3f84ab4ec2b7b07353d7933db4'
--     or parent_id is null
--     or has_directory_access_combined(parent_id, 'write')
--   )
);

create policy "update_directory_entities"
on public.directory_entities for update
using (
  (select auth.uid()) is not null and (
    is_admin_or_service_role()
    or has_directory_access_combined(id, 'write')
  )
);

create policy "delete_directory_entities"
on public.directory_entities for delete
using (
  (select auth.uid()) is not null and (
    is_admin_or_service_role()
    or has_directory_access_combined(id, 'delete')
  )
);



create policy "read_experiments"
on public.experiments for select
using (
  (select auth.uid()) is not null and (
    is_admin_or_service_role()
    or has_directory_access_combined(directory_entity_id, 'read')
  )
);

create policy "insert_experiments"
on public.experiments for insert
with check (
  (select auth.uid()) is not null and (
    is_admin_or_service_role()
    or has_directory_access_combined(parent_id, 'write')
  )
);

create policy "update_experiments"
on public.experiments for update
using (
  (select auth.uid()) is not null and (
    is_admin_or_service_role()
    or has_directory_access_combined(directory_entity_id, 'write')
  )
);

create policy "delete_experiments"
on public.experiments for delete
using (
  (select auth.uid()) is not null and (
    is_admin_or_service_role()
    or has_directory_access_combined(directory_entity_id, 'delete')
  )
);

create policy "read_images"
on public.images for select
using (
  (select auth.uid()) is not null and (
    is_admin_or_service_role()
    or exists (
      select 1 from public.experiments e
      where e.id = experiment_id and (
        has_directory_access_combined(e.directory_entity_id, 'read')
      )
    )
  )
);

create policy "insert_images"
on public.images for insert
with check (
  (select auth.uid()) is not null and (
    is_admin_or_service_role()
    or exists (
      select 1 from public.experiments e
      where e.id = experiment_id and (
        has_directory_access_combined(e.parent_id, 'write')
      )
    )
  )
);


create policy "update_images"
on public.images for update
using (
  (select auth.uid()) is not null and (
    is_admin_or_service_role()
    or exists (
      select 1 from public.experiments e
      where e.id = experiment_id and (
        has_directory_access_combined(e.directory_entity_id, 'write')
      )
    )
  )
);

create policy "delete_images"
on public.images for delete
using (
  (select auth.uid()) is not null and (
    is_admin_or_service_role()
    or exists (
      select 1 from public.experiments e
      where e.id = experiment_id and (
        has_directory_access_combined(e.directory_entity_id, 'delete')
      )
    )
  )
);

create policy "read_layers"
on public.layers for select
using (
  (select auth.uid()) is not null and (
    is_admin_or_service_role()
    or exists (
      select 1 from public.experiments e
      where e.id = experiment_id and (
        has_directory_access_combined(e.directory_entity_id, 'read')
      )
    )
  )
);

create policy "insert_layers"
on public.layers for insert
with check (
  (select auth.uid()) is not null and (
    is_admin_or_service_role()
    or exists (
      select 1 from public.experiments e
      where e.id = experiment_id and (
        has_directory_access_combined(e.parent_id, 'write')
      )
    )
  )
);


create policy "update_layers"
on public.layers for update
using (
  (select auth.uid()) is not null and (
    is_admin_or_service_role()
    or exists (
      select 1 from public.experiments e
      where e.id = experiment_id and (
        has_directory_access_combined(e.directory_entity_id, 'read')
      )
    )
  )
);

create policy "delete_layers"
on public.layers for delete
using (
  (select auth.uid()) is not null and (
    is_admin_or_service_role()
    or exists (
      select 1 from public.experiments e
      where e.id = experiment_id and (
        has_directory_access_combined(e.directory_entity_id, 'delete')
      )
    )
  )
);

create policy "read_layer_metadata"
on public.layer_metadata for select
using (
  (select auth.uid()) is not null and (
    is_admin_or_service_role()
    or exists (
      select 1
      from public.layers l
      join public.experiments e on l.experiment_id = e.id
      where l.id = layer_id and (
        has_directory_access_combined(e.directory_entity_id, 'read')
      )
    )
  )
);

create policy "insert_layer_metadata"
on public.layer_metadata for insert
with check (
  (select auth.uid()) is not null and (
    is_admin_or_service_role()
    or exists (
      select 1
      from public.layers l
      join public.experiments e on l.experiment_id = e.id
      where l.id = layer_id and (
        has_directory_access_combined(e.parent_id, 'write')
      )
    )
  )
);


create policy "update_layer_metadata"
on public.layer_metadata for update
using (
  (select auth.uid()) is not null and (
    is_admin_or_service_role()
    or exists (
      select 1
      from public.layers l
      join public.experiments e on l.experiment_id = e.id
      where l.id = layer_id and (
        has_directory_access_combined(e.directory_entity_id, 'write')
      )
    )
  )
);

create policy "delete_layer_metadata"
on public.layer_metadata for delete
using (
  (select auth.uid()) is not null and (
    is_admin_or_service_role()
    or exists (
      select 1
      from public.layers l
      join public.experiments e on l.experiment_id = e.id
      where l.id = layer_id and (
        has_directory_access_combined(e.directory_entity_id, 'delete')
      )
    )
  )
);







-- insert root directory after table + trigger are created
insert into public.directory_entities (
  name, parent_id, entity_type
)
values (
  'root', null, 'directory'
);