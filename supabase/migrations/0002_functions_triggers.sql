-- 0002_functions_triggers.sql
-- Fungsi trigger audit, pembuatan profil, helper, dan RPC.

-- ---------------------------------------------------------------------------
-- Trigger audit otomatis (client tidak boleh mengisi kolom audit)
-- ---------------------------------------------------------------------------
create or replace function public.set_audit_columns()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.updated_at := now();
    new.updated_by := coalesce(auth.uid(), new.created_by);
    new.deleted_at := null;
    new.deleted_by := null;
  elsif tg_op = 'UPDATE' then
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.updated_at := now();
    new.updated_by := coalesce(auth.uid(), old.updated_by);
    if new.deleted_at is not null and old.deleted_at is null then
      new.deleted_by := coalesce(auth.uid(), new.deleted_by);
    elsif new.deleted_at is null then
      new.deleted_by := null;
    else
      new.deleted_at := old.deleted_at;
      new.deleted_by := old.deleted_by;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists set_audit_columns_profiles on public.profiles;
create trigger set_audit_columns_profiles
  before insert or update on public.profiles
  for each row execute function public.set_audit_columns();

drop trigger if exists set_audit_columns_access_requests on public.access_requests;
create trigger set_audit_columns_access_requests
  before insert or update on public.access_requests
  for each row execute function public.set_audit_columns();

drop trigger if exists set_audit_columns_categories on public.categories;
create trigger set_audit_columns_categories
  before insert or update on public.categories
  for each row execute function public.set_audit_columns();

drop trigger if exists set_audit_columns_transactions on public.transactions;
create trigger set_audit_columns_transactions
  before insert or update on public.transactions
  for each row execute function public.set_audit_columns();

-- ---------------------------------------------------------------------------
-- Pembuatan profil + admin pertama saat user baru muncul di auth.users
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  perform pg_advisory_xact_lock(hashtext('first_admin_lock'));

  if exists (select 1 from public.profiles) then
    v_role := 'pending';
  else
    v_role := 'admin';
  end if;

  insert into public.profiles (
    id, email, full_name, avatar_url, role, created_by, updated_by
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    v_role,
    new.id,
    new.id
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Helper
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and deleted_at is null
  );
$$;

-- ---------------------------------------------------------------------------
-- RPC: akses
-- ---------------------------------------------------------------------------
create or replace function public.request_access(p_message text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Belum masuk.';
  end if;

  if exists (
    select 1 from public.profiles
    where id = v_uid and role = 'admin' and deleted_at is null
  ) then
    raise exception 'Anda sudah admin.';
  end if;

  if exists (
    select 1 from public.access_requests
    where user_id = v_uid and status = 'pending' and deleted_at is null
  ) then
    raise exception 'Sudah ada permintaan yang menunggu persetujuan.';
  end if;

  insert into public.access_requests (user_id, message, created_by, updated_by)
  values (v_uid, nullif(trim(coalesce(p_message, '')), ''), v_uid, v_uid);
end;
$$;

create or replace function public.approve_access(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'Hanya admin yang boleh menyetujui akses.';
  end if;

  update public.access_requests
  set status = 'approved',
      reviewed_by = v_uid,
      reviewed_at = now(),
      updated_by = v_uid
  where id = p_request_id
    and status = 'pending'
    and deleted_at is null;

  if not found then
    raise exception 'Permintaan tidak ditemukan atau sudah diproses.';
  end if;

  update public.profiles
  set role = 'admin',
      updated_by = v_uid
  where id = (select user_id from public.access_requests where id = p_request_id)
    and deleted_at is null;
end;
$$;

create or replace function public.reject_access(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'Hanya admin yang boleh menolak akses.';
  end if;

  update public.access_requests
  set status = 'rejected',
      reviewed_by = v_uid,
      reviewed_at = now(),
      updated_by = v_uid
  where id = p_request_id
    and status = 'pending'
    and deleted_at is null;

  if not found then
    raise exception 'Permintaan tidak ditemukan atau sudah diproses.';
  end if;
end;
$$;

create or replace function public.revoke_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'Hanya admin yang boleh mencabut akses.';
  end if;

  if p_user_id = v_uid then
    raise exception 'Tidak boleh mencabut akses sendiri.';
  end if;

  if (
    select count(*)
    from public.profiles
    where role = 'admin' and deleted_at is null
  ) <= 1 then
    raise exception 'Harus tersisa minimal satu admin.';
  end if;

  update public.profiles
  set role = 'pending',
      updated_by = v_uid
  where id = p_user_id
    and role = 'admin'
    and deleted_at is null;

  if not found then
    raise exception 'Admin tidak ditemukan.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: soft delete
-- ---------------------------------------------------------------------------
create or replace function public.soft_delete_transaction(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'Hanya admin yang boleh menghapus.';
  end if;

  update public.transactions
  set deleted_at = now(),
      deleted_by = v_uid,
      updated_by = v_uid
  where id = p_id
    and deleted_at is null;

  if not found then
    raise exception 'Transaksi tidak ditemukan.';
  end if;
end;
$$;

create or replace function public.soft_delete_category(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'Hanya admin yang boleh menghapus.';
  end if;

  if exists (
    select 1 from public.transactions
    where category_id = p_id and deleted_at is null
  ) then
    raise exception 'Kategori masih dipakai transaksi, tidak bisa dihapus.';
  end if;

  update public.categories
  set deleted_at = now(),
      deleted_by = v_uid,
      updated_by = v_uid
  where id = p_id
    and deleted_at is null;

  if not found then
    raise exception 'Kategori tidak ditemukan.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: pencarian transaksi (fitur tambahan di luar spesifikasi awal)
-- Mencocokkan kata kunci pada catatan transaksi ATAU nama kategori,
-- seluruh waktu, terurut dari yang terbaru.
-- ---------------------------------------------------------------------------
create or replace function public.search_transactions(p_query text)
returns table (
  id uuid,
  type text,
  amount bigint,
  category_id uuid,
  transaction_date date,
  note text,
  category_name text,
  category_icon text,
  category_color text,
  created_by uuid,
  created_by_name text,
  created_at timestamptz,
  updated_at timestamptz,
  updated_by uuid,
  updated_by_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_pattern text;
begin
  if auth.uid() is null or not public.is_admin() then
    return;
  end if;

  v_pattern := '%' || replace(replace(replace(trim(coalesce(p_query, '')), '\', '\\'), '%', '\%'), '_', '\_') || '%';

  return query
  select
    t.id,
    t.type,
    t.amount,
    t.category_id,
    t.transaction_date,
    t.note,
    c.name as category_name,
    c.icon as category_icon,
    c.color as category_color,
    t.created_by,
    p.full_name as created_by_name,
    t.created_at,
    t.updated_at,
    t.updated_by,
    pu.full_name as updated_by_name
  from public.transactions t
  join public.categories c on c.id = t.category_id
  left join public.profiles p on p.id = t.created_by
  left join public.profiles pu on pu.id = t.updated_by
  where t.deleted_at is null
    and c.deleted_at is null
    and (
      t.note ilike v_pattern
      or c.name ilike v_pattern
    )
  order by t.transaction_date desc, t.created_at desc
  limit 200;
end;
$$;
