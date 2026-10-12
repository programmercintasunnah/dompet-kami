-- Uji skenario penerimaan Dompet Kami.
\set ON_ERROR_STOP on
\set QUIET on

do $$
declare
  v_admin uuid := '11111111-1111-1111-1111-111111111111';
  v_user  uuid := '22222222-2222-2222-2222-222222222222';
  v_user3 uuid := '33333333-3333-3333-3333-333333333333';
  v_cat uuid;
  v_tx uuid;
  v_req uuid;
  v_count int;
  v_role text;
  v_note text;
begin
  -- 1. Kategori seed
  select count(*) into v_count from public.categories where deleted_at is null;
  assert v_count = 15, format('seed kategori = %s (diharapkan 15)', v_count);

  -- 2. Akun pertama -> admin, kedua -> pending
  insert into auth.users (id, email, raw_user_meta_data) values
    (v_admin, 'admin@rumah.test', '{"full_name":"Ayah Admin","avatar_url":"https://x/a.png"}'),
    (v_user,  'anggota@rumah.test', '{"full_name":"Ibu Anggota"}');

  select role into v_role from public.profiles where id = v_admin;
  assert v_role = 'admin', format('peran akun pertama = %s', v_role);

  select role into v_role from public.profiles where id = v_user;
  assert v_role = 'pending', format('peran akun kedua = %s', v_role);

  -- 3. Akun ketiga juga pending
  insert into auth.users (id, email, raw_user_meta_data)
  values (v_user3, 'anak@rumah.test', '{"full_name":"Anak"}');
  select role into v_role from public.profiles where id = v_user3;
  assert v_role = 'pending', 'akun ketiga harus pending';

  -- 4. Siapkan kategori (dijalankan sebagai pemilik tabel)
  select id into v_cat from public.categories
  where lower(name) = 'transportasi' and type = 'expense' limit 1;
  assert v_cat is not null, 'kategori Transportasi tidak ditemukan';

  raise notice '--- blok 1 lulus ---';
end $$;

-- ============================================================================
-- 5. RLS: role anon tidak bisa membaca apa pun
-- ============================================================================
set role anon;
do $$
declare v_count int; v_ok boolean := false;
begin
  -- Karena privilege dicabut, akses anon gagal di level tabel (bukan cuma RLS).
  begin
    select count(*) into v_count from public.transactions;
  exception when insufficient_privilege then v_ok := true;
  end;
  assert v_ok, 'anon harus ditolak membaca transactions';

  v_ok := false;
  begin
    select count(*) into v_count from public.categories;
  exception when insufficient_privilege then v_ok := true;
  end;
  assert v_ok, 'anon harus ditolak membaca categories';

  v_ok := false;
  begin
    select count(*) into v_count from public.profiles;
  exception when insufficient_privilege then v_ok := true;
  end;
  assert v_ok, 'anon harus ditolak membaca profiles';
end $$;
reset role;
\echo --- RLS anon lulus ---

-- ============================================================================
-- 6. Sebagai akun pending: tidak bisa baca transaksi, hanya profilnya sendiri
-- ============================================================================
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
set role authenticated;

do $$
declare v_count int; v_is_admin boolean;
begin
  select public.is_admin() into v_is_admin;
  assert v_is_admin = false, 'pending tidak boleh is_admin()';

  select count(*) into v_count from public.profiles;
  assert v_count = 1, format('pending hanya boleh lihat profil sendiri (dapat %s)', v_count);

  -- Tidak boleh insert transaksi
  begin
    insert into public.transactions (type, amount, category_id, transaction_date, created_by, updated_by)
    values ('expense', 1000, (select id from public.categories limit 1), current_date, null, null);
    raise exception 'INSERT transaksi oleh pending seharusnya gagal';
  exception when insufficient_privilege or check_violation then
    null;
  end;
end $$;
reset role;
\echo --- RLS pending lulus ---

-- ============================================================================
-- 7. Sebagai admin: insert transaksi, audit terisi otomatis, RPC pencarian
-- ============================================================================
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
set role authenticated;

do $$
declare
  v_cat uuid;
  v_tx uuid;
  v_count int;
  v_creator uuid;
  v_created_by uuid;
  v_deleted_at timestamptz;
begin
  assert public.is_admin() = true, 'admin pertama harus is_admin() = true';

  select id into v_cat from public.categories
  where lower(name) = 'transportasi' and type = 'expense' limit 1;

  insert into public.transactions (type, amount, category_id, transaction_date, note, created_by, updated_by)
  values ('expense', 150000, v_cat, date '2026-09-15', 'Ganti oli motor', null, null)
  returning id into v_tx;

  select created_by into v_created_by from public.transactions where id = v_tx;
  assert v_created_by = auth.uid(), 'created_by harus terisi otomatis dari auth.uid()';

  -- Client tidak boleh mengisi kolom audit secara paksa
  assert (select created_at is not null and updated_at is not null
          from public.transactions where id = v_tx), 'created_at/updated_at wajib terisi';

  -- Pencarian lintas bulan
  select count(*) into v_count from public.search_transactions('oli');
  assert v_count = 1, format('pencarian "oli" menghasilkan %s baris (diharapkan 1)', v_count);

  select count(*) into v_count from public.search_transactions('transportasi');
  assert v_count >= 1, 'pencarian nama kategori harus cocok';

  select count(*) into v_count from public.search_transactions('katakunci-tidak-ada');
  assert v_count = 0, 'kata kunci tak dikenal harus 0 hasil';

  raise notice '--- admin insert + audit + pencarian lulus ---';
end $$;
reset role;

-- Soft delete dijalankan di level pemilik tabel agar hasilnya bisa diverifikasi.
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
do $$
declare
  v_tx uuid;
  v_deleted_at timestamptz;
  v_deleted_by uuid;
  v_count int;
begin
  select id into v_tx from public.transactions where note = 'Ganti oli motor' limit 1;
  assert v_tx is not null, 'transaksi uji tidak ditemukan';

  perform public.soft_delete_transaction(v_tx);

  select deleted_at, deleted_by into v_deleted_at, v_deleted_by
  from public.transactions where id = v_tx;
  assert v_deleted_at is not null, 'soft delete harus mengisi deleted_at';
  assert v_deleted_by = auth.uid(), 'soft delete harus mengisi deleted_by';

  -- Baris tetap ada (bukan hard delete)
  select count(*) into v_count from public.transactions where id = v_tx;
  assert v_count = 1, 'baris harus tetap ada setelah soft delete';
  raise notice '--- soft delete (deleted_at + deleted_by + baris tetap) lulus ---';
end $$;

-- ...namun tidak terlihat lagi lewat RLS
set role authenticated;
do $$
declare v_count int;
begin
  select count(*) into v_count from public.transactions where note = 'Ganti oli motor';
  assert v_count = 0, 'transaksi terhapus harus hilang dari tampilan RLS';
  raise notice '--- transaksi terhapus tidak terlihat oleh RLS: lulus ---';
end $$;
reset role;

-- ============================================================================
-- 8. Alur permintaan akses: pending minta -> admin setujui -> jadi admin
-- ============================================================================
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
set role authenticated;
select public.request_access('Minta akses ya');

do $$
declare v_count int; v_status text;
begin
  select count(*) into v_count from public.access_requests;
  assert v_count = 1, 'permintaan akses harus terlihat oleh pemohon';
  select status into v_status from public.access_requests limit 1;
  assert v_status = 'pending', 'status permintaan harus pending';

  -- Tidak boleh mengajukan dua permintaan pending sekaligus
  begin
    select public.request_access('lagi');
    raise exception 'permintaan kedua seharusnya ditolak';
  exception when unique_violation or raise_exception then
    null;
  end;
end $$;
reset role;

-- Admin melihat permintaan dan menyetujui
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
set role authenticated;
do $$
declare v_req uuid; v_role text; v_status text; v_reviewer uuid;
begin
  select id into v_req from public.access_requests where status = 'pending' limit 1;
  perform public.approve_access(v_req);

  select role into v_role from public.profiles where id = '22222222-2222-2222-2222-222222222222';
  assert v_role = 'admin', 'setelah disetujui, akun kedua menjadi admin';

  select status, reviewed_by into v_status, v_reviewer
  from public.access_requests where id = v_req;
  assert v_status = 'approved', 'status permintaan menjadi approved';
  assert v_reviewer = auth.uid(), 'reviewed_by terisi admin yang menyetujui';

  raise notice '--- alur approve akses lulus ---';
end $$;

-- Akun ketiga mengajukan akses...
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
set role authenticated;
select public.request_access(null);
reset role;

-- ...dan admin KEDUA (bukan admin pertama) yang menyetujuinya
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
set role authenticated;
do $$
declare v_req uuid; v_role text;
begin
  select id into v_req from public.access_requests
  where status = 'pending' and user_id = '33333333-3333-3333-3333-333333333333'
  limit 1;
  perform public.approve_access(v_req);
  select role into v_role from public.profiles where id = '33333333-3333-3333-3333-333333333333';
  assert v_role = 'admin', 'admin kedua boleh menyetujui akun ketiga';
  raise notice '--- admin kedua menyetujui akun ketiga: lulus ---';
end $$;
reset role;

-- ============================================================================
-- 9. Client tidak bisa mengubah role / kolom audit langsung
-- ============================================================================
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
set role authenticated;
do $$
declare v_rows int; v_role text;
begin
  update public.profiles set role = 'admin' where id = '22222222-2222-2222-2222-222222222222';
  get diagnostics v_rows = row_count;
  assert v_rows = 0, format('UPDATE role dari client harus tidak berpengaruh (rows=%s)', v_rows);
  raise notice '--- pemblokiran update role lulus ---';
end $$;
reset role;

-- ============================================================================
-- 10. revoke_admin: tidak boleh diri sendiri, wajib sisa minimal 1 admin
-- ============================================================================
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
set role authenticated;
do $$
begin
  begin
    perform public.revoke_admin('33333333-3333-3333-3333-333333333333');
    raise exception 'revoke diri sendiri seharusnya gagal';
  exception when raise_exception then null; end;

  perform public.revoke_admin('22222222-2222-2222-2222-222222222222');
  assert (select role from public.profiles
          where id = '22222222-2222-2222-2222-222222222222') = 'pending',
         'revoke_admin mengubah role menjadi pending';
  raise notice '--- revoke_admin lulus ---';
end $$;
reset role;

-- ============================================================================
-- 11. Kategori yang dipakai transaksi tidak bisa dihapus
-- ============================================================================
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
set role authenticated;
do $$
declare v_cat uuid;
begin
  select id into v_cat from public.categories
  where lower(name) = 'transportasi' and type = 'expense' limit 1;
  begin
    perform public.soft_delete_category(v_cat);
    raise exception 'kategori terpakai seharusnya tidak bisa dihapus';
  exception when raise_exception then null; end;
  raise notice '--- proteksi kategori terpakai lulus ---';
end $$;
reset role;

-- ============================================================================
-- 12. Pencarian menolak non-admin (mengembalikan hasil kosong, bukan error)
-- ============================================================================
set role authenticated;
-- 222 sudah dicabut admin-nya pada uji 10 sehingga kini berstatus pending
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
do $$
declare v_count int; v_role text;
begin
  select role into v_role from public.profiles where id = auth.uid();
  assert v_role = 'pending', format('peran uji harus pending (dapat %s)', v_role);

  select count(*) into v_count from public.search_transactions('oli');
  assert v_count = 0, 'non-admin tidak boleh menerima hasil pencarian';

  raise notice '--- pencarian menolak non-admin: lulus ---';
end $$;
reset role;

set request.jwt.claim.sub = '';

\echo SEMUA UJIAN LULUS
