-- 0003_rls.sql
-- Aktifkan RLS dan tetapkan kebijakan akses.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
  on public.profiles for select
  using (
    id = auth.uid()
    or public.is_admin()
  );

-- Tidak ada policy INSERT/UPDATE/DELETE untuk client.
-- Pembuatan profil lewat trigger, perubahan role lewat RPC.

-- ---------------------------------------------------------------------------
-- access_requests
-- ---------------------------------------------------------------------------
alter table public.access_requests enable row level security;

drop policy if exists "access_requests_select_own_or_admin" on public.access_requests;
create policy "access_requests_select_own_or_admin"
  on public.access_requests for select
  using (
    user_id = auth.uid()
    or public.is_admin()
  );

-- INSERT/UPDATE hanya lewat RPC (SECURITY DEFINER).

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
alter table public.categories enable row level security;

drop policy if exists "categories_select_admin" on public.categories;
create policy "categories_select_admin"
  on public.categories for select
  using (
    public.is_admin()
    and deleted_at is null
  );

drop policy if exists "categories_insert_admin" on public.categories;
create policy "categories_insert_admin"
  on public.categories for insert
  with check (public.is_admin());

drop policy if exists "categories_update_admin" on public.categories;
create policy "categories_update_admin"
  on public.categories for update
  using (public.is_admin())
  with check (public.is_admin());

-- Tidak ada policy DELETE: hapus selalu soft delete lewat RPC.

-- ---------------------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------------------
alter table public.transactions enable row level security;

drop policy if exists "transactions_select_admin" on public.transactions;
create policy "transactions_select_admin"
  on public.transactions for select
  using (
    public.is_admin()
    and deleted_at is null
  );

drop policy if exists "transactions_insert_admin" on public.transactions;
create policy "transactions_insert_admin"
  on public.transactions for insert
  with check (public.is_admin());

drop policy if exists "transactions_update_admin" on public.transactions;
create policy "transactions_update_admin"
  on public.transactions for update
  using (public.is_admin())
  with check (public.is_admin());

-- Tidak ada policy DELETE: hapus selalu soft delete lewat RPC.

-- Pastikan role anon tidak punya akses baca apa pun.
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon;
