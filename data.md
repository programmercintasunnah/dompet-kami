# Prompt: Aplikasi Pencatat Keuangan Keluarga "Dompet Kami"

Kamu adalah senior full-stack engineer. Bangun **PWA mobile-first** untuk mencatat pemasukan dan pengeluaran keluarga yang dipakai bersama oleh anggota dalam satu rumah. Ikuti seluruh spesifikasi di bawah. Jika ada hal yang ambigu, pilih opsi paling aman dan catat asumsinya di `README.md`.

---

## 1. Tech Stack (wajib)

| Kebutuhan | Pilihan |
|---|---|
| Framework | React + Vite + TypeScript (strict mode) |
| PWA | `vite-plugin-pwa` (manifest, service worker, ikon, installable) |
| Styling | Tailwind CSS |
| Komponen UI | shadcn/ui (gaya mobile), Drawer dari `vaul` untuk bottom sheet |
| Routing | React Router |
| Data fetching dan cache | TanStack Query |
| Form dan validasi | React Hook Form + Zod |
| Grafik | Recharts |
| Backend | Supabase (PostgreSQL, Auth, Realtime, RLS, RPC) |
| Client | `@supabase/supabase-js` |
| Login | **Google OAuth saja** (`supabase.auth.signInWithOAuth({ provider: 'google' })`) |

Tidak ada server backend buatan sendiri. Logika bisnis berada di PostgreSQL (RLS, trigger, fungsi RPC).

Environment variable (jangan hardcode):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## 2. Aturan Akses (inti aplikasi)

Aplikasi ini untuk **satu rumah (single household)**. Semua akun berbagi satu set data.

### Peran
- `admin`: boleh melihat, menambah, mengubah, dan menghapus (soft delete) data, serta menyetujui permintaan akses akun lain.
- `pending`: akun yang sudah login Google tetapi belum disetujui.

### Alur
1. **Akun Google pertama** yang login ke aplikasi otomatis menjadi `admin`.
2. **Akun kedua dan seterusnya** otomatis berstatus `pending`. Mereka hanya melihat layar **"Menunggu persetujuan"** dengan tombol **"Minta Akses"** (opsional: kolom pesan singkat). Mereka **tidak bisa melihat data keuangan sama sekali**.
3. Setelah menekan "Minta Akses", muncul permintaan akses berstatus `pending` untuk semua admin.
4. **Admin mana pun** (termasuk admin yang dulunya akun kedua) bisa **menyetujui** atau **menolak** permintaan. Jika disetujui, akun tersebut menjadi `admin` penuh.
5. Akun ketiga dan seterusnya mengikuti alur yang sama dan bisa disetujui oleh admin mana pun.
6. Akun yang ditolak boleh mengajukan permintaan lagi setelah ditolak.
7. **Opsional:** admin bisa mencabut akses admin lain. Aturan: tidak boleh mencabut diri sendiri, dan harus selalu tersisa minimal 1 admin.

### Penegakan di database (bukan hanya di UI)
- Pembuatan profil dan penentuan "admin pertama" dilakukan oleh **trigger di `auth.users`**, harus aman dari race condition (gunakan advisory lock).
- Perubahan `role` **tidak boleh** lewat update langsung dari client. Semua perubahan role melalui fungsi RPC `SECURITY DEFINER` yang memeriksa `is_admin()`.
- Semua tabel memakai **Row Level Security**. Akun `pending` tidak boleh membaca tabel `transactions` atau `categories`.

---

## 3. Skema Database

Semua tabel **wajib** memiliki 6 kolom audit berikut:

| Kolom | Tipe | Keterangan |
|---|---|---|
| `created_at` | `timestamptz` not null default `now()` | |
| `created_by` | `uuid` references `profiles(id)` | diisi otomatis |
| `updated_at` | `timestamptz` not null default `now()` | |
| `updated_by` | `uuid` references `profiles(id)` | diisi otomatis |
| `deleted_at` | `timestamptz` null | `NULL` berarti masih aktif |
| `deleted_by` | `uuid` references `profiles(id)` | diisi otomatis saat soft delete |

### Tabel

**`profiles`**: `id uuid pk references auth.users(id)`, `email text unique not null`, `full_name text`, `avatar_url text`, `role text not null check (role in ('admin','pending'))`, ditambah kolom audit.

**`access_requests`**: `id uuid pk default gen_random_uuid()`, `user_id uuid not null references profiles(id)`, `message text`, `status text not null default 'pending' check (status in ('pending','approved','rejected'))`, `reviewed_by uuid references profiles(id)`, `reviewed_at timestamptz`, ditambah kolom audit. Hanya boleh ada **satu** permintaan `pending` per `user_id` (partial unique index).

**`categories`**: `id uuid pk`, `name text not null`, `type text not null check (type in ('income','expense'))`, `icon text`, `color text`, ditambah kolom audit. Buat unique index pada `(lower(name), type)` untuk baris yang `deleted_at is null`. Seed kategori default:
- Pemasukan: Gaji, Bonus, Usaha, Lainnya
- Pengeluaran: Makan & Minum, Belanja Dapur, Transportasi, Listrik & Air, Internet & Pulsa, Pendidikan, Kesehatan, Hiburan, Cicilan, Sedekah, Lainnya

**`transactions`**: `id uuid pk`, `type text not null check (type in ('income','expense'))`, `amount bigint not null check (amount > 0)` (Rupiah bulat, tanpa desimal), `category_id uuid not null references categories(id)`, `transaction_date date not null`, `note text`, ditambah kolom audit. Index pada `(transaction_date desc)` dan `(category_id)`.

### Trigger audit otomatis (client tidak boleh mengisi kolom audit)

Buat satu fungsi trigger `BEFORE INSERT OR UPDATE` yang dipasang di semua tabel. Referensi:

```sql
create or replace function public.set_audit_columns()
returns trigger language plpgsql as $$
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
end $$;
```

### Trigger pembuatan profil + admin pertama

```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_role text;
begin
  perform pg_advisory_xact_lock(hashtext('first_admin_lock'));
  if exists (select 1 from public.profiles) then
    v_role := 'pending';
  else
    v_role := 'admin';
  end if;

  insert into public.profiles (id, email, full_name, avatar_url, role, created_by, updated_by)
  values (
    new.id, new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    v_role, new.id, new.id
  );
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
```

### Fungsi bantu

```sql
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and deleted_at is null
  );
$$;
```

### Fungsi RPC (semua `SECURITY DEFINER`, `set search_path = public`)
- `request_access(p_message text)`: hanya untuk user `pending` yang belum punya permintaan `pending`.
- `approve_access(p_request_id uuid)`: wajib `is_admin()`. Ubah `profiles.role` menjadi `admin` dan tandai permintaan `approved` beserta `reviewed_by` dan `reviewed_at`.
- `reject_access(p_request_id uuid)`: wajib `is_admin()`. Tandai permintaan `rejected`.
- `revoke_admin(p_user_id uuid)` *(opsional)*: wajib `is_admin()`, tidak boleh pada diri sendiri, dan harus tersisa minimal 1 admin.
- `soft_delete_transaction(p_id uuid)` dan `soft_delete_category(p_id uuid)`: wajib `is_admin()`, mengisi `deleted_at`. Soft delete dilakukan lewat RPC agar tidak terkena masalah RLS saat baris yang baru di-update menjadi tidak terlihat oleh policy SELECT.

### Kebijakan RLS
- **`profiles`**: SELECT jika `id = auth.uid()` atau `is_admin()`. Tidak ada policy INSERT/UPDATE/DELETE untuk client (hanya lewat trigger/RPC).
- **`access_requests`**: user bisa SELECT permintaan miliknya, admin bisa SELECT semua. INSERT/UPDATE hanya lewat RPC.
- **`categories`** dan **`transactions`**:
  - SELECT, INSERT, dan UPDATE hanya jika `is_admin()`.
  - SELECT hanya mengembalikan baris dengan `deleted_at is null`.
  - **Tidak ada policy DELETE** (tidak ada hard delete dari client).
- Aktifkan RLS di semua tabel. Pastikan role `anon` tidak punya akses ke tabel apa pun.

### Realtime
Aktifkan Supabase Realtime pada `transactions` dan `access_requests`. Frontend meng-invalidate query TanStack Query saat ada perubahan, supaya transaksi yang dicatat anggota lain muncul otomatis.

---

## 4. Fitur Aplikasi

1. **Login Google**: layar login sederhana dengan tombol "Masuk dengan Google".
2. **Layar Menunggu Persetujuan** untuk akun `pending`: info singkat, tombol "Minta Akses", status permintaan terakhir (menunggu atau ditolak), dan tombol keluar.
3. **Beranda**: saldo bulan ini, total pemasukan, total pengeluaran, 5 transaksi terbaru, dan pintasan ke laporan.
4. **Catat transaksi** (bottom sheet): toggle Pemasukan/Pengeluaran, input nominal (keypad angka, format Rupiah otomatis), kategori (grid ikon), tanggal (default hari ini), dan catatan.
5. **Riwayat**: daftar transaksi dikelompokkan per tanggal, filter bulan, jenis, kategori, dan anggota pencatat. Setiap item menampilkan nama pencatat (dari `created_by`). Geser atau ketuk untuk edit atau hapus (konfirmasi dulu, lalu soft delete).
6. **Laporan**: ringkasan per bulan, grafik donat pengeluaran per kategori, grafik batang pemasukan vs pengeluaran 6 bulan terakhir.
7. **Akun**:
   - Profil dan tombol keluar
   - Khusus admin: menu **"Kelola Akses"** berisi daftar permintaan akses (Setujui/Tolak) dan daftar admin aktif
   - Badge angka pada menu Akun atau Kelola Akses jika ada permintaan yang menunggu
8. **Kelola kategori** (admin): tambah, ubah, dan hapus (soft delete) kategori.
9. **Info audit** pada detail transaksi: "Dicatat oleh X pada tanggal Y" dan "Terakhir diubah oleh Z".

---

## 5. UI/UX (mobile-first, rasa aplikasi native)

- Bottom navigation 4 tab: **Beranda, Riwayat, Laporan, Akun**
- Tombol **+ mengambang (FAB)** di tengah bawah untuk catat transaksi cepat
- Form tambah dan edit berbentuk **bottom sheet** (Drawer vaul), bukan halaman baru
- Header sederhana, tanpa sidebar
- Area sentuh minimal 44px, font input minimal 16px (mencegah auto-zoom di iOS)
- Perhatikan safe area (`env(safe-area-inset-bottom)`) untuk bottom nav dan FAB
- Input nominal memakai `inputMode="numeric"`
- Skeleton loading, transisi halus, dan empty state yang ramah
- Warna: hijau tua (primer), hijau muda (aksen/latar aktif), pemasukan hijau, pengeluaran merah
- Mendukung mode terang dan gelap, `theme-color` di manifest
- Seluruh teks UI **bahasa Indonesia**. Format mata uang `Rp 1.500.000` (locale `id-ID`), zona waktu **Asia/Jakarta**, tanggal seperti "12 Okt 2026"
- Desktop: konten dibatasi lebar maksimum (sekitar 480px) dan dipusatkan, bukan melebar penuh

---

## 6. PWA

- Manifest: nama, short_name, `display: standalone`, `theme_color`, `background_color`, ikon 192/512 dan maskable
- Service worker (Workbox via `vite-plugin-pwa`): cache app shell sehingga aplikasi terbuka saat offline, dengan banner "Anda sedang offline"
- Pembaruan otomatis dengan notifikasi "Versi baru tersedia, muat ulang"
- Pencatatan data saat offline **di luar cakupan versi 1**: saat offline, tombol simpan dinonaktifkan dengan pesan yang jelas

---

## 7. Struktur Proyek yang Diharapkan

```
.
├── supabase/
│   └── migrations/
│       ├── 0001_schema.sql          # tabel, index, kolom audit
│       ├── 0002_functions_triggers.sql
│       ├── 0003_rls.sql
│       └── 0004_seed_categories.sql
├── src/
│   ├── lib/            # supabaseClient, format (rupiah, tanggal), constants
│   ├── types/          # tipe database (hasil generate Supabase)
│   ├── hooks/          # useAuth, useProfile, useTransactions, useAccessRequests, ...
│   ├── components/     # ui (shadcn), BottomNav, TransactionSheet, ...
│   ├── pages/          # Login, PendingAccess, Home, History, Reports, Account, ManageAccess
│   ├── routes/         # guard: belum login -> /login, pending -> /menunggu, admin -> app
│   └── main.tsx
├── .env.example
└── README.md
```

Route guard:
- Belum login: arahkan ke `/login`
- Login dan role `pending`: arahkan ke `/menunggu`
- Login dan role `admin`: boleh masuk seluruh aplikasi
- `/akun/kelola-akses` hanya untuk admin

---

## 8. Hal yang Wajib Diserahkan

1. Seluruh migrasi SQL (urut dan dapat dijalankan ulang tanpa error)
2. Kode aplikasi lengkap sesuai struktur di atas
3. `README.md` berisi:
   - Cara membuat proyek Supabase dan menjalankan migrasi
   - **Cara setup Google OAuth** (membuat OAuth Client ID di Google Cloud Console, Authorized redirect URI dari Supabase, mengisi Client ID dan Secret di Supabase Auth Providers, serta Site URL dan Redirect URLs untuk lokal dan produksi)
   - Cara menjalankan lokal dan build
   - Cara deploy frontend ke Vercel, Netlify, atau Cloudflare Pages
   - Daftar asumsi yang kamu ambil
4. `.env.example`

---

## 9. Kriteria Penerimaan (uji manual)

- [ ] Akun Google pertama yang login otomatis menjadi `admin`
- [ ] Akun kedua yang login berstatus `pending`, hanya melihat layar menunggu persetujuan, dan **tidak bisa** membaca `transactions` (uji juga lewat query langsung dengan client Supabase)
- [ ] Akun kedua menekan "Minta Akses", lalu admin melihat permintaan dan badge notifikasi
- [ ] Setelah disetujui, akun kedua langsung menjadi admin tanpa perlu login ulang (realtime atau refetch profil)
- [ ] Akun ketiga mengajukan akses dan **akun kedua** bisa menyetujuinya
- [ ] Dua login bersamaan sebagai akun pertama tidak menghasilkan dua admin pertama (race condition aman)
- [ ] Client tidak bisa mengubah `role`, `created_by`, `updated_by`, atau `deleted_by` lewat request langsung
- [ ] Setiap baris di semua tabel memiliki `created_at`, `created_by`, `updated_at`, `updated_by`, `deleted_at`, `deleted_by` yang terisi benar
- [ ] Hapus transaksi hanya mengisi `deleted_at` dan `deleted_by` (baris tetap ada di database) dan hilang dari tampilan
- [ ] Transaksi yang dicatat satu anggota muncul otomatis di HP anggota lain
- [ ] Aplikasi bisa di-install ke layar utama Android dan iPhone, dan Lighthouse PWA lolos
- [ ] Tidak ada `service_role` key di kode frontend

---

## 10. Aturan Kerja untuk AI

- Kerjakan bertahap: (1) skema dan RLS, (2) auth dan guard, (3) transaksi dan kategori, (4) laporan, (5) kelola akses, (6) PWA dan polish.
- Setelah tiap tahap, jelaskan singkat apa yang selesai dan cara mengujinya.
- Jangan menaruh secret apa pun di repo. Jangan memakai `service_role` di frontend.
- Gunakan TypeScript strict, tanpa `any` kecuali terpaksa dan diberi komentar alasannya.
- Tulis kode yang rapi dan modular. Jangan membuat satu file raksasa.
- Jika spesifikasi bertentangan atau ada keputusan desain penting, tanyakan terlebih dahulu sebelum melanjutkan.