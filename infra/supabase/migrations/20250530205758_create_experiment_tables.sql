create type permission_role as enum ('', 'r', 'rw', 'rwd');
create type platform_name as enum ('10X Xenium', '10X Visium', '10X Visium HD', 'H&E', 'IHC', 'NanoString GeoMx DSP', 'Curio Bioscience Slide-seq', 'NanoString CosMx', 'Vizgen MERSCOPE');

create table public.experiments (
  id uuid primary key default gen_random_uuid(),
  version text not null default 'v0.0.1',
  created_by uuid references auth.users(id) on delete restrict,
  created_at timestamp with time zone default now(),
  name text not null,
  platform platform_name not null,
  platform_version text not null default '',
  permission permission_role not null default 'r',
  authenticated_users_read uuid[] default '{}',
  authenticated_users_annot uuid[] default '{}',
  authenticated_users_write uuid[] default '{}',
  image_ids uuid[] default '{}',
  layer_ids uuid[] default '{}',
  tags text[] default '{}'
);

create table public.images (
  id uuid primary key default gen_random_uuid(),
  version text not null default 'v0.0.1',
  created_by uuid references auth.users(id) on delete resctrict,
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
  created_by uuid references auth.users(id) on delete resctrict,
  created_at timestamp with time zone default now(),
  experiment_id uuid references public.experiments(id) on delete cascade,
  name text not null,
  metadata jsonb,
  path text not null,
  tags text[] default '{}'
);

create table public.layermetadata (
  id uuid primary key default gen_random_uuid(),
  version text not null default 'v0.0.1',
  created_by uuid references auth.users(id) on delete resctrict,
  created_at timestamp with time zone default now(),
  layer_id uuid references public.layers(id) on delete cascade,
  name text not null,
  metadata jsonb,
  path text not null,
  tags text[] default '{}'
);

alter table public.experiments enable row level security;
alter table public.images enable row level security;
alter table public.layers enable row level security;
alter table public.layermetadata enable row level security;