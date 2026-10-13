# Dompet Kami

PWA mobile-first untuk mencatat pemasukan dan pengeluaran satu rumah tangga.
Dibangun dengan React + Vite + TypeScript (strict), Tailwind CSS, TanStack Query,
React Hook Form + Zod, Recharts, dan Supabase (PostgreSQL, Auth, RLS, RPC, Realtime).

Seluruh teks antarmuka berbahasa Indonesia, mata uang format `Rp 1.500.000`
(locale `id-ID`), dan tanggal memakai zona waktu Asia/Jakarta.

---

## Daftar isi

1. [Fitur](#fitur)
2. [Menyiapkan project Supabase](#menyiapkan-project-supabase)
3. [Menjalankan migrasi](#menjalankan-migrasi)
4. [Setup Google OAuth](#setup-google-oauth)
5. [Menjalankan secara lokal](#menjalankan-secara-lokal)
6. [Build dan deploy](#build-dan-deploy)
7. [Struktur proyek](#struktur-proyek)
8. [Asumsi](#asumsi)
9. [Daftar asumsi teknis](#daftar-asumsi-teknis)

---

## Fitur

- **Login Google** (satu-satunya metode login).
- **Alur akses tunggal**: akun Google pertama otomatis `admin`; akun berikutnya
  berstatus `pending`, hanya melihat layar **Menunggu Persetujuan** dan tidak
  bisa membaca `transactions`/`categories` (ditegakkan lewat RLS, bukan hanya UI).
- **Beranda**: saldo bulan terpilih, total pemasukan & pengeluaran, 5 transaksi
  terbaru, dan pintasan ke laporan.
- **Catat transaksi** lewat bottom sheet: toggle pemasukan/pengeluaran, keypad
  angka dengan format Rupiah otomatis, grid kategori, tanggal, dan catatan.
- **Riwayat**: dikelompokkan per tanggal, filter bulan, jenis, kategori, plus
  **pencarian kata kunci** (mis. `ganti oli`) yang mencocokkan teks **catatan**
  dan **nama kategori**.
- **Laporan**: ringkasan bulan, grafik donat pengeluaran per kategori, dan
  grafik batang pemasukan vs pengeluaran 6 bulan terakhir.
- **Akun**: profil, keluar, tema terang/gelap, **Kelola Akses** (admin), dan
  **Kelola Kategori** (admin).
- **Info audit** pada form ubah transaksi: "Dicatat oleh …" dan "Terakhir
  diubah oleh …".
- **PWA**: installable, cache app shell, banner "Anda sedang offline", dan
  notifikasi "Versi baru tersedia, muat ulang".
- **Realtime**: transaksi yang dicatat satu anggota muncul otomatis di HP
  anggota lain.

### Pencarian transaksi

Pencarian adalah **tambahan di luar spek awal** `data.md` dan menjadi jawaban
untuk pertanyaan "kapan terakhir kali saya ganti oli motor?".

- Input pencarian ada di puncak halaman **Riwayat**.
- Saat kata kunci ≥ 2 karakter, pencarian **melintasi seluruh bulan** (filter
  bulan dinonaktifkan sementara) dan mengabaikan filter jenis/kategori.
- Pencocokan dilakukan di database lewat RPC `search_transactions(p_query)`
  (`SECURITY DEFINER`, hanya `is_admin()`, baris `deleted_at is null`), mencocokkan
  `transactions.note ILIKE` **atau** `categories.name ILIKE`, diurutkan dari
  `transaction_date` terbaru.
- Hasilnya menampilkan kartu ringkasan **"Terakhir kali …"** (tanggal, nominal,
  kategori) plus jumlah kecocokan dan total, lalu daftar hasil.

---

## Menyiapkan project Supabase

1. Buka <https://supabase.com/dashboard> → **New project**.
2. Isi nama project, region terdekat (ap-southeast-1 untuk Indonesia), dan
   password database. Catat nilai **Project URL** dan **anon/public key** di
   menu **Project Settings → API**.
3. Di folder ini, salin berkas environment lalu isi nilainya:

   ```bash
   cp .env.example .env
   ```

   ```env
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

   `service_role` key **tidak pernah** dan **tidak boleh** ditaruh di frontend.

---

## Menjalankan migrasi

Buka **Supabase Dashboard → SQL Editor → New query**, lalu jalankan keempat
file berikut **secara berurutan** (semua ditulis idempoten, aman dijalankan
ulang):

| Urutan | Berkas | Isi |
|---|---|---|
| 1 | `supabase/migrations/0001_schema.sql` | tabel, index, kolom audit, publication realtime |
| 2 | `supabase/migrations/0002_functions_triggers.sql` | trigger audit, trigger profil/admin pertama, `is_admin()`, semua RPC |
| 3 | `supabase/migrations/0003_rls.sql` | aktifkan RLS + kebijakan |
| 4 | `supabase/migrations/0004_seed_categories.sql` | kategori default |

Salin isi file ke SQL Editor lalu tekan **Run**. Ulangi langkah 1–4 bila ada
perubahan skema.

> Alternatif: bila Anda memakai Supabase CLI lokal, tempatkan file yang sama di
> `supabase/migrations/` lalu jalankan `supabase db push`.

### Uji migrasi secara lokal (tanpa project Supabase)

```bash
bash supabase/tests/run_local.sh
```

Skrip ini menjalankan keempat migrasi ke Postgres Docker (stub lingkungan
Supabase: schema `auth`, role `anon`/`authenticated`, publication realtime),
menjalankannya **dua kali** untuk membuktikan idempoten, lalu memeriksa seluruh
skenario penerimaan: akun pertama jadi `admin`, akun kedua `pending` tidak bisa
membaca `transactions`, alur permintaan/setujui akses, blokade perubahan `role`
langsung dari client, soft delete (`deleted_at`/`deleted_by` terisi dan baris
tetap ada), pencarian lintas bulan, `revoke_admin`, dan **race condition dua
login admin pertama**.

### Apa yang dijaga migrasi

- **Race condition admin pertama**: `handle_new_user()` mengambil
  `pg_advisory_xact_lock(hashtext('first_admin_lock'))` sehingga dua login
  bersamaan tidak menghasilkan dua admin pertama.
- **Client tidak bisa mengubah `role` / kolom audit**: tidak ada policy
  INSERT/UPDATE untuk `profiles`, dan semua perubahan role hanya lewat RPC
  `SECURITY DEFINER` yang memeriksa `is_admin()`.
- **Hapus selalu soft delete**: tidak ada policy DELETE; hapus transaksi/kategori
  lewat RPC `soft_delete_transaction` / `soft_delete_category`.
- **Akun `pending` tidak bisa membaca data**: policy SELECT `transactions` dan
  `categories` mensyaratkan `is_admin()`; role `anon` dicabut seluruh aksesnya.

### Uji cepat keamanan (opsional)

Setelah login sebagai akun kedua (status `pending`), jalankan di Console browser:

```js
const { supabase } = await import("/src/lib/supabaseClient.ts");
const { data, error } = await supabase.from("transactions").select("*");
console.log(data, error); // harus [] (tanpa error, RLS menyaring)
```

---

## Setup Google OAuth

### 1. Buat OAuth Client ID di Google Cloud Console

1. Buka <https://console.cloud.google.com/> → buat/select project.
2. **APIs & Services → OAuth consent screen**: pilih **External**, isi app name
   dan email, save. (Untuk pemakaian keluarga, tambahkan akun Google Anda di
   **Test users** agar tidak perlu verifikasi.)
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Name: `Dompet Kami`
   - **Authorized JavaScript origins**: `http://localhost:5173`
     (dan URL produksi Anda, mis. `https://dompet-kami.vercel.app`)
   - **Authorized redirect URIs**: ambil dari Supabase —
     `https://<PROJECT-REF>.supabase.co/auth/v1/callback`
4. Simpan **Client ID** dan **Client Secret**.

### 2. Isi di Supabase

**Authentication → Providers → Google**:

- Enable Google
- Paste **Client ID** dan **Client Secret**
- Save

### 3. Site URL dan Redirect URLs di Supabase

**Authentication → URL Configuration**:

- **Site URL**: `http://localhost:5173` (saat development)
- **Redirect URLs**: tambahkan
  - `http://localhost:5173/*`
  - `https://<domain-produksi>/*`

Ganti Site URL ke domain produksi setelah deploy. Tanpa langkah ini, login
Google akan menolak redirect.

### 4. Uji login

Tekan **Masuk dengan Google**. Akun pertama yang berhasil login otomatis jadi
`admin`. Akun Google kedua akan berstatus `pending`.

---

## Menjalankan secara lokal

```bash
npm install
npm run icons      # membuat ikon PWA di public/ (sudah ter-commit bila dijalankan sekali)
npm run dev        # http://localhost:5173
```

Script lain:

```bash
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit (strict)
npm run build      # build produksi + generate service worker
npm run preview    # pratinjau hasil build
```

---

## Build dan deploy

```bash
npm run build
```

Hasil build ada di `dist/` (termasuk `sw.js` dan `manifest.webmanifest`).

**Vercel**

- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`
- Tambahkan environment variable `VITE_SUPABASE_URL` dan
  `VITE_SUPABASE_ANON_KEY` (Settings → Environment Variables, scope
  **Production + Preview**)
- **Setiap kali mengubah/menambah environment variable, lakukan deploy
  ulang.** Vite menyematkan `import.meta.env` saat proses build, jadi tanpa
  redeploy bundel lama tetap dipakai (dan permintaan login jatuh ke
  `localhost:54321`)
- Cara memeriksa build sudah membaca env: buka berkas `assets/index-*.js`
  yang dirujuk `index.html`, pastikan memuat `https://<REF>.supabase.co` dan
  **tidak** memuat `localhost:54321`
- Jangan lupa menambahkan domain Vercel ke **Redirect URLs** Supabase

**Netlify**

- Build: `npm run build` · Publish: `dist`
- Tambahkan kedua environment variable di Site settings

**Cloudflare Pages**

- Build command: `npm run build` · Output: `dist`
- Tambahkan kedua environment variable di Settings → Environment variables

Setelah deploy, perbarui **Site URL** dan **Redirect URLs** Supabase ke domain
baru, lalu uji login ulang.

---

## Struktur proyek

```
.
├── supabase/migrations/
│   ├── 0001_schema.sql
│   ├── 0002_functions_triggers.sql
│   ├── 0003_rls.sql
│   └── 0004_seed_categories.sql
├── scripts/generate-icons.mjs     # generate ikon PNG dari SVG via sharp
├── public/icons/                  # ikon 192/512/maskable
├── src/
│   ├── lib/                       # supabaseClient, format, constants, cn
│   ├── types/                     # tipe database & entitas
│   ├── hooks/                     # useAuth, useProfile, useTransactions,
│   │                              # useSearchTransactions, useMutations, ...
│   ├── components/
│   │   ├── ui/                    # button, drawer (vaul), dialog, select, ...
│   │   ├── layout/                # AppLayout, BottomNav
│   │   └── transactions/          # TransactionSheet, TransactionListItem
│   ├── pages/                     # Login, PendingAccess, Home, History,
│   │                              # Reports, Account, ManageAccess, ...
│   ├── routes/RouteGuard.tsx      # belum login / pending / admin
│   ├── App.tsx
│   └── main.tsx
├── .env.example
└── README.md
```

**Route guard**

| Kondisi | Tujuan |
|---|---|
| Belum login | `/login` |
| Login, role `pending` | `/menunggu` |
| Login, role `admin` | seluruh aplikasi |
| `/akun/kelola-akses`, `/akun/kelola-kategori` | hanya admin (keduanya sudah berada di dalam guard admin) |

---

## Asumsi

Keputusan yang diambil ketika spesifikasi memberi ruang untuk interpretasi:

1. **Pencarian transaksi** tidak ada di spek awal dan ditambahkan sesuai
   permintaan Anda (lihat [Pencarian transaksi](#pencarian-transaksi)).
2. Saat pencarian aktif, **filter bulan dan filter lain dinonaktifkan** agar
   bisa menjawab "kapan terakhir kali" lintas bulan. Membersihkan kolom pencarian
   mengembalikan tampilan per-bulan.
3. **Kategori yang masih dipakai transaksi tidak bisa dihapus** (hanya bisa
   diubah). Ini mencegah transaksi kehilangan nama kategori. Ditegakkan lewat
   `soft_delete_category`.
4. **Tidak ada mode offline untuk penyimpanan** (sesuai spek §6): tombol simpan
   dinonaktifkan dan banner offline ditampilkan bila koneksi hilang.
5. **Seluruh anggota rumah berperan `admin`** setelah disetujui — tidak ada
   peran "anggota biasa" yang hanya bisa membaca, sesuai spek §2.
6. **Revoke admin aktif** (spek §2 butir 7 ditandai opsional): tersedia di
   Kelola Akses dengan aturan tidak boleh mencabut diri sendiri dan wajib
   menyisakan minimal 1 admin.
7. **Grafik donat memakai warna kategori** jika ada, jika tidak memakai warna
   kategori bawaan.
8. **Agregasi laporan dihitung di client** dari satu query rentang tanggal —
   volume data keluarga kecil sehingga tidak perlu RPC agregat.
9. **Label grafik batang** format ringkas (`500 rb`, `2 jt`) agar muat di layar
   ponsel.
10. **Satu household / satu set data** tanpa pemilihan rumah: semua admin
    melihat dan mengelola data yang sama.

---

## Daftar asumsi teknis

- `import.meta.env` membaca `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`;
  bila belum diisi aplikasi tetap bisa dibuka, tetapi login akan gagal (ada
  peringatan ramah di layar login).
- Tipe database ditulis manual di `src/types/`. Setelah project Supabase jalan,
  bisa digenerate dengan `supabase gen types typescript --linked > src/types/db.ts`.
- Ikon PWA dibuat oleh `npm run icons` (sharp + SVG). File PNG sudah tersimpan di
  `public/icons/`.
- Komponen UI ditulis mengikuti gaya shadcn/ui (CVA + tailwind-merge) di
  `src/components/ui/`, memakai `vaul` untuk bottom sheet.
- Select memakai `<select>` native agar konsisten dengan pemilih bawaan
  iOS/Android (lebih ramah mobile daripada listbox custom).
