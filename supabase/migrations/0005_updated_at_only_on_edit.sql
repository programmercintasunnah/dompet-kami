-- 0005_updated_at_only_on_edit.sql
-- updated_at/updated_by hanya terisi ketika baris benar-benar diubah.
-- Saat INSERT keduanya dibiarkan NULL agar data baru tidak tampak "pernah diubah".

create or replace function public.set_audit_columns()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.updated_at := null;
    new.updated_by := null;
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

-- updated_at boleh kosong sampai ada perubahan sungguhan.
alter table public.profiles        alter column updated_at drop not null;
alter table public.profiles        alter column updated_at drop default;
alter table public.access_requests alter column updated_at drop not null;
alter table public.access_requests alter column updated_at drop default;
alter table public.categories      alter column updated_at drop not null;
alter table public.categories      alter column updated_at drop default;
alter table public.transactions    alter column updated_at drop not null;
alter table public.transactions    alter column updated_at drop default;

-- Bersihkan data lama: updated_at = created_at berarti belum pernah diedit.
-- Trigger dimatikan sementara agar UPDATE pembersihan tidak mengisi ulang kolom.
alter table public.profiles disable trigger set_audit_columns_profiles;
update public.profiles
  set updated_at = null, updated_by = null
  where updated_at = created_at;
alter table public.profiles enable trigger set_audit_columns_profiles;

alter table public.access_requests disable trigger set_audit_columns_access_requests;
update public.access_requests
  set updated_at = null, updated_by = null
  where updated_at = created_at;
alter table public.access_requests enable trigger set_audit_columns_access_requests;

alter table public.categories disable trigger set_audit_columns_categories;
update public.categories
  set updated_at = null, updated_by = null
  where updated_at = created_at;
alter table public.categories enable trigger set_audit_columns_categories;

alter table public.transactions disable trigger set_audit_columns_transactions;
update public.transactions
  set updated_at = null, updated_by = null
  where updated_at = created_at;
alter table public.transactions enable trigger set_audit_columns_transactions;
