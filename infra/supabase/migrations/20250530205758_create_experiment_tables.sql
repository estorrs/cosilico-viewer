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


create or replace function public.set_created_by()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.created_by := auth.uid();
  return new;
end;
$$;

create trigger set_created_by_experiments
before insert on public.experiments
for each row
execute procedure public.set_created_by();

create trigger set_created_by_images
before insert on public.images
for each row
execute procedure public.set_created_by();

create trigger set_created_by_layers
before insert on public.layers
for each row
execute procedure public.set_created_by();

create trigger set_created_by_layer_metadata
before insert on public.layer_metadata
for each row
execute procedure public.set_created_by();




create or replace function has_directory_access(start_id uuid, access_type text)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  result boolean := false;
  log_output text;
begin
  with recursive directory_chain as (
    select
      d.id,
      d.parent_id,
      d.permission,
      d.authenticated_users_read,
      d.authenticated_users_write,
      d.authenticated_users_delete,
      0 as depth
    from public.directory_entities d
    where d.id = start_id

    union all

    select
      d.id,
      d.parent_id,
      d.permission,
      d.authenticated_users_read,
      d.authenticated_users_write,
      d.authenticated_users_delete,
      dc.depth + 1
    from public.directory_entities d
    join directory_chain dc on d.id = dc.parent_id
  ),
  nearest_user_permission as (
    select *
    from directory_chain
    where (select auth.uid()) = any(authenticated_users_read)
       or (select auth.uid()) = any(authenticated_users_write)
       or (select auth.uid()) = any(authenticated_users_delete)
    order by depth asc
    limit 1
  ),
  user_has_permission as (
    select *,
      case access_type
        when 'read' then (select auth.uid()) = any(authenticated_users_read)
        when 'write' then (select auth.uid()) = any(authenticated_users_write)
        when 'delete' then (select auth.uid()) = any(authenticated_users_delete)
        else false
      end as uhp
    from nearest_user_permission
  ),
  nearest_directory_permission as (
    select *
    from directory_chain
    where permission in ('r', 'rw', 'rwd')
    order by depth asc
    limit 1
  ),
  directory_has_permission as (
    select *,
      case access_type
        when 'read' then permission in ('r', 'rw', 'rwd')
        when 'write' then permission in ('rw', 'rwd')
        when 'delete' then permission = 'rwd'
        else false
      end as dhp
    from nearest_directory_permission
  )

--   select string_agg(format('id = %s authenticated_users_read=%s, authenticated_users_write=%s, authenticated_users_delete=%s, depth=%s', id, authenticated_users_read, authenticated_users_write, authenticated_users_delete, depth), E'\n')
--   into log_output
--   from nearest_user_permission;

--   raise log E'nearest_user_permission:\n%s', log_output;

--   return true;

--   -- Evaluate logic: user-level takes priority
--   select true into result
--   from user_has_permission
--   where uhp = true
--   limit 1;

--   raise log 'result 1: %s', result;

-- --   if not result then
-- if result is null then
--     select dhp into result
--     from directory_has_permission
--     limit 1;
--   end if;

--   raise log 'result 2: %s', result;

  select coalesce(
    (select uhp from user_has_permission where uhp = true limit 1),
    (select dhp from directory_has_permission limit 1),
    false
  ) into result;

  return result;
end;
$$;


-- select string_agg(
--       format('user_has_permission=%s, permission=%s, depth=%s', user_has_permission, permission, depth),
--       E'\n'
--   )
--   into log_output
--   from fallback_default_permission;

--   raise log E'fallback_default_permission:\n%s', log_output;


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
    or has_directory_access(id, 'read')
);

create policy "read_directory_entities_for_insert"
on public.directory_entities for select
to authenticated, service_role
using (
    is_admin_or_service_role()
    or parent_id is null
    or has_directory_access(parent_id, 'read')
);

create policy "insert_directory_entities"
on public.directory_entities for insert
to authenticated, service_role
with check (
    is_admin_or_service_role()
    or parent_id is null
    or has_directory_access(parent_id, 'write')
);

create policy "update_directory_entities"
on public.directory_entities for update
to authenticated, service_role
using (
    is_admin_or_service_role()
    or has_directory_access(id, 'write')
);

create policy "delete_directory_entities"
on public.directory_entities for delete
to authenticated, service_role
using (
    is_admin_or_service_role()
    or has_directory_access(id, 'delete')
);





create policy "read_experiments"
on public.experiments for select
to authenticated, service_role
using (
    is_admin_or_service_role()
    or has_directory_access(id, 'read')
);

create policy "read_experiments_for_insert"
on public.experiments for select
to authenticated, service_role
using (
    is_admin_or_service_role()
    or has_directory_access(parent_id, 'read')
);

create policy "insert_experiments"
on public.experiments for insert
to authenticated, service_role
with check (
    is_admin_or_service_role()
    or has_directory_access(parent_id, 'write')
);

create policy "update_experiments"
on public.experiments for update
to authenticated, service_role
using (
    is_admin_or_service_role()
    or has_directory_access(id, 'write')
);

create policy "delete_experiments"
on public.experiments for delete
to authenticated, service_role
using (
    is_admin_or_service_role()
    or has_directory_access(id, 'delete')
);






create policy "read_images"
on public.images for select
to authenticated, service_role
using (
    is_admin_or_service_role()
    or exists (
      select 1 from public.experiments e
      where e.id = experiment_id and (
        has_directory_access(e.directory_entity_id, 'read')
      )
    )
);

create policy "read_images_for_insert"
on public.images for select
to authenticated, service_role
using (
    is_admin_or_service_role()
    or exists (
      select 1 from public.experiments e
      where e.id = experiment_id and (
        has_directory_access(e.directory_entity_id, 'read')
      )
    )
);

create policy "insert_images"
on public.images for insert
to authenticated, service_role
with check (
    is_admin_or_service_role()
    or exists (
      select 1 from public.experiments e
      where e.id = experiment_id and (
        has_directory_access(e.directory_entity_id, 'write')
      )
    )
);

create policy "update_images"
on public.images for update
to authenticated, service_role
using (
    is_admin_or_service_role()
    or exists (
      select 1 from public.experiments e
      where e.id = experiment_id and (
        has_directory_access(e.directory_entity_id, 'write')
      )
    )
);

create policy "delete_images"
on public.images for delete
to authenticated, service_role
using (
    is_admin_or_service_role()
    or exists (
      select 1 from public.experiments e
      where e.id = experiment_id and (
        has_directory_access(e.directory_entity_id, 'write') -- write access to experiment allows image deletion
      )
    )
);




create policy "read_layers"
on public.layers for select
to authenticated, service_role
using (
    is_admin_or_service_role()
    or exists (
      select 1 from public.experiments e
      where e.id = experiment_id and (
        has_directory_access(e.directory_entity_id, 'read')
      )
    )
);

create policy "read_layers_for_insert"
on public.layers for select
to authenticated, service_role
using (
    is_admin_or_service_role()
    or exists (
      select 1 from public.experiments e
      where e.id = experiment_id and (
        has_directory_access(e.directory_entity_id, 'read')
      )
    )
);

create policy "insert_layers"
on public.layers for insert
to authenticated, service_role
with check (
    is_admin_or_service_role()
    or exists (
      select 1 from public.experiments e
      where e.id = experiment_id and (
        has_directory_access(e.directory_entity_id, 'write')
      )
    )
);

create policy "update_layers"
on public.layers for update
to authenticated, service_role
using (
    is_admin_or_service_role()
    or exists (
      select 1 from public.experiments e
      where e.id = experiment_id and (
        has_directory_access(e.directory_entity_id, 'write')
      )
    )
);

create policy "delete_layers"
on public.layers for delete
to authenticated, service_role
using (
    is_admin_or_service_role()
    or exists (
      select 1 from public.experiments e
      where e.id = experiment_id and (
        has_directory_access(e.directory_entity_id, 'write') -- write access to experiment allows layer deletion
      )
    )
);






create policy "read_layer_metadata"
on public.layer_metadata for select
to authenticated, service_role
using (
    is_admin_or_service_role()
    or exists (
      select 1
      from public.layers l
      join public.experiments e on l.experiment_id = e.id
      where l.id = layer_id and (
        has_directory_access(e.directory_entity_id, 'read')
      )
    )
);

create policy "read_layer_metadata_for_insert"
on public.layer_metadata for select
to authenticated, service_role
using (
    is_admin_or_service_role()
    or exists (
      select 1
      from public.layers l
      join public.experiments e on l.experiment_id = e.id
      where l.id = layer_id and (
        has_directory_access(e.directory_entity_id, 'read')
      )
    )
);

create policy "insert_layer_metadata"
on public.layer_metadata for insert
to authenticated, service_role
with check (
    is_admin_or_service_role()
    or exists (
      select 1
      from public.layers l
      join public.experiments e on l.experiment_id = e.id
      where l.id = layer_id and (
        has_directory_access(e.directory_entity_id, 'write')
      )
    )
);

create policy "update_layer_metadata"
on public.layer_metadata for update
to authenticated, service_role
using (
    is_admin_or_service_role()
    or exists (
      select 1
      from public.layers l
      join public.experiments e on l.experiment_id = e.id
      where l.id = layer_id and (
        has_directory_access(e.directory_entity_id, 'write')
      )
    )
);

create policy "delete_layer_metadata"
on public.layer_metadata for delete
to authenticated, service_role
using (
    is_admin_or_service_role()
    or exists (
      select 1
      from public.layers l
      join public.experiments e on l.experiment_id = e.id
      where l.id = layer_id and (
        has_directory_access(e.directory_entity_id, 'write')
      )
    )
);