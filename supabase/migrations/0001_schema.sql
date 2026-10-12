-- 0001_schema.sql
-- Tabel, index, dan kolom audit untuk Dompet Kami.
-- Jalankan berurutan: 0001 -> 0002 -> 0003 -> 0004.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Kolom audit dipasang lewat fungsi trigger di 0002_functions_triggers.sql.
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  full_name   text,
  avatar_url  text,
  role        text not null check (role in ('admin', 'pending')),
  created_at  timestamptz not null default now(),
  created_by  uuid references public.profiles (id),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id),
  deleted_at  timestamptz,
  deleted_by  uuid references public.profiles (id)
);

create table if not exists public.access_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  message     text,
  status      text not null default 'pending'
                check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at  timestamptz not null default now(),
  created_by  uuid references public.profiles (id),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id),
  deleted_at  timestamptz,
  deleted_by  uuid references public.profiles (id)
);

-- Satu permintaan pending per pengguna.
create unique index if not exists access_requests_one_pending_per_user
  on public.access_requests (user_id)
  where status = 'pending' and deleted_at is null;

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        text not null check (type in ('income', 'expense')),
  icon        text,
  color       text,
  created_at  timestamptz not null default now(),
  created_by  uuid references public.profiles (id),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id),
  deleted_at  timestamptz,
  deleted_by  uuid references public.profiles (id)
);

create unique index if not exists categories_name_type_unique
  on public.categories (lower(name), type)
  where deleted_at is null;

create table if not exists public.transactions (
  id              uuid primary key default gen_random_uuid(),
  type            text not null check (type in ('income', 'expense')),
  amount          bigint not null check (amount > 0),
  category_id     uuid not null references public.categories (id),
  transaction_date date not null,
  note            text,
  created_at      timestamptz not null default now(),
  created_by      uuid references public.profiles (id),
  updated_at      timestamptz not null default now(),
  updated_by      uuid references public.profiles (id),
  deleted_at      timestamptz,
  deleted_by      uuid references public.profiles (id)
);

create index if not exists transactions_date_idx
  on public.transactions (transaction_date desc);

create index if not exists transactions_category_idx
  on public.transactions (category_id);

create index if not exists transactions_type_idx
  on public.transactions (type);

-- ---------------------------------------------------------------------------
-- Realtime: transaksi dan permintaan akses disiarkan ke klien.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'transactions'
  ) then
    alter publication supabase_realtime add table public.transactions;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'access_requests'
  ) then
    alter publication supabase_realtime add table public.access_requests;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'categories'
  ) then
    alter publication supabase_realtime add table public.categories;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;
