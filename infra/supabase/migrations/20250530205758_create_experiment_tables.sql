create type permission_role as enum ('', 'r', 'rw', 'rwd');
create type platform_name as enum ('10X Xenium', '10X Visium', '10X Visium HD', 'H&E', 'IHC', 'NanoString GeoMx', 'Curio Bioscience Slide-seq', 'NanoString CosMx', 'Vizgen MERSCOPE', 'Unknown');
create type layer_metadata_type as enum('categorical', 'continuous');

create table public.experiments (
  id uuid primary key default gen_random_uuid(),
  version text not null default 'v0.0.1',
  created_by uuid references auth.users(id) on delete restrict,
  created_at timestamp with time zone default now(),
  experiment_date timestamp with time zone,
  name text not null,
  platform platform_name not null,
  platform_version text not null default '',
  permission permission_role not null default 'r',
  authenticated_users_read uuid[] default '{}',
  authenticated_users_write uuid[] default '{}',
  authenticated_users_delete uuid[] default '{}',
  image_ids uuid[] default '{}',
  layer_ids uuid[] default '{}',
  tags text[] default '{}'
);

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

create table public.layermetadata (
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

alter table public.experiments enable row level security;
alter table public.images enable row level security;
alter table public.layers enable row level security;
alter table public.layermetadata enable row level security;


create function is_admin_or_service_role()
returns boolean as $$
  select
    auth.role() = 'service_role'
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    );
$$ language sql stable;

create policy "read_experiments"
on public.experiments for select
using (
  auth.uid() is not null and (
    is_admin_or_service_role()
    or permission in ('r', 'rw', 'rwd')
    or auth.uid() = any(authenticated_users_read)
  )
);

create policy "update_experiments"
on public.experiments for update
using (
  auth.uid() is not null and (
    is_admin_or_service_role()
    or permission in ('rw', 'rwd')
    or auth.uid() = any(authenticated_users_write)
  )
);

create policy "delete_experiments"
on public.experiments for delete
using (
  auth.uid() is not null and (
    is_admin_or_service_role()
    or permission = 'rwd'
    or auth.uid() = any(authenticated_users_delete)
  )
);

create policy "read_images"
on public.images for select
using (
  auth.uid() is not null and (
    is_admin_or_service_role()
    or exists (
      select 1 from public.experiments e
      where e.id = experiment_id and (
        e.permission in ('r', 'rw', 'rwd')
        or auth.uid() = any(e.authenticated_users_read)
      )
    )
  )
);

create policy "update_images"
on public.images for update
using (
  auth.uid() is not null and (
    is_admin_or_service_role()
    or exists (
      select 1 from public.experiments e
      where e.id = experiment_id and (
        e.permission in ('rw', 'rwd')
        or auth.uid() = any(e.authenticated_users_write)
      )
    )
  )
);

create policy "delete_images"
on public.images for delete
using (
  auth.uid() is not null and (
    is_admin_or_service_role()
    or exists (
      select 1 from public.experiments e
      where e.id = experiment_id and (
        e.permission = 'rwd'
        or auth.uid() = any(e.authenticated_users_delete)
      )
    )
  )
);

create policy "read_layers"
on public.layers for select
using (
  auth.uid() is not null and (
    is_admin_or_service_role()
    or exists (
      select 1 from public.experiments e
      where e.id = experiment_id and (
        e.permission in ('r', 'rw', 'rwd')
        or auth.uid() = any(e.authenticated_users_read)
      )
    )
  )
);

create policy "update_layers"
on public.layers for update
using (
  auth.uid() is not null and (
    is_admin_or_service_role()
    or exists (
      select 1 from public.experiments e
      where e.id = experiment_id and (
        e.permission in ('rw', 'rwd')
        or auth.uid() = any(e.authenticated_users_write)
      )
    )
  )
);

create policy "delete_layers"
on public.layers for delete
using (
  auth.uid() is not null and (
    is_admin_or_service_role()
    or exists (
      select 1 from public.experiments e
      where e.id = experiment_id and (
        e.permission = 'rwd'
        or auth.uid() = any(e.authenticated_users_delete)
      )
    )
  )
);

create policy "read_layermetadata"
on public.layermetadata for select
using (
  auth.uid() is not null and (
    is_admin_or_service_role()
    or exists (
      select 1
      from public.layers l
      join public.experiments e on l.experiment_id = e.id
      where l.id = layer_id and (
        e.permission in ('r', 'rw', 'rwd')
        or auth.uid() = any(e.authenticated_users_read)
      )
    )
  )
);

create policy "update_layermetadata"
on public.layermetadata for update
using (
  auth.uid() is not null and (
    is_admin_or_service_role()
    or exists (
      select 1
      from public.layers l
      join public.experiments e on l.experiment_id = e.id
      where l.id = layer_id and (
        e.permission in ('rw', 'rwd')
        or auth.uid() = any(e.authenticated_users_write)
      )
    )
  )
);

create policy "delete_layermetadata"
on public.layermetadata for delete
using (
  auth.uid() is not null and (
    is_admin_or_service_role()
    or exists (
      select 1
      from public.layers l
      join public.experiments e on l.experiment_id = e.id
      where l.id = layer_id and (
        e.permission = 'rwd'
        or auth.uid() = any(e.authenticated_users_delete)
      )
    )
  )
);