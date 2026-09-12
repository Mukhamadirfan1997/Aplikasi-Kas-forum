# Catatan Pengerjaan — Aplikasi Kas Forum PPPK

## 2026-09-09 — Setup Awal Selesai

### 1. Project Tauri + React + TS

- `npm create tauri-app@latest --template react-ts --identifier com.forumpppk.kas --force`
- File `prompt-aplikasi-kas-forum-pppk.md` sempat terhapus karena `--force`, sudah dipulihkan manual.
- `npm install` sukses. Test `npm run build` OK.
- Lokasi: `D:\aplikasi sekolah\projek tauri+react`

### 2. Tailwind CSS (v4)

- Install `tailwindcss @tailwindcss/vite` + plugin di `vite.config.ts:3-10`
- `src/index.css:1` = `@import "tailwindcss"` + design tokens shadcn (warna HSL, radius) di `@theme`
- `src/main.tsx:4` import `index.css`, hapus `App.css` dari `App.tsx:1`
- Build verified: `vite build` 222 kB JS

### 3. shadcn/ui

- `components.json` dibuat manual (style default, baseColor slate)
- Alias `@/*` -> `src/*` di `tsconfig.json:24` + `tsconfig.node.json:9` + `vite.config.ts:12` + install `@types/node`
- `src/lib/utils.ts:1` fungsi `cn()` + `formatRupiah()`
- Components: `button.tsx`, `card.tsx`, `input.tsx`, `label.tsx`, `badge.tsx`, `table.tsx` (copy shadcn)
- Deps: `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`, `@radix-ui/react-slot`, `@radix-ui/react-label`

### 4. Struktur Folder

- Frontend: `src/pages/` (Dashboard.tsx, Anggota.tsx, Placeholder.tsx), `src/components/layout/Sidebar.tsx`, `src/components/ui/*`, `src/lib/`, `src/hooks/`
- Rust: `src-tauri/src/commands/`, `src-tauri/src/db/`, `src-tauri/src/models/`
- `src/App.tsx` diganti layout sidebar: `Sidebar + Dashboard/Anggota/Placeholder` (navigasi state lokal)

### 5. SQLite + Migration (rusqlite 0.31 bundled)

- `src-tauri/Cargo.toml:28` tambah `rusqlite {bundled}`, `chrono`
- `src-tauri/src/db/migration.rs:1` SQL lengkap 6 tabel:
  - `anggota`, `periode_iuran` (UNIQUE bulan+tahun), `pembayaran_iuran` (UNIQUE anggota+periode), `kategori_transaksi`, `kas_transaksi`, `users`
  - PRAGMA foreign_keys=ON, journal_mode=WAL, default kategori 5 baris
  - Saldo TIDAK disimpan, dihitung SUM
- `src-tauri/src/db/mod.rs:1` fungsi `get_db_path()` (app_data_dir/kas.db, bukan folder install) + `init_db()` + `DbState(Mutex<Connection>)`
- `src-tauri/src/models/mod.rs` struct `Anggota`, `AnggotaInput`, `PeriodeIuran`, dll dengan Serialize/Deserialize
- `src-tauri/src/commands/anggota.rs` commands:
  - `get_anggota(search?:string, status_aktif?:bool) -> Vec<Anggota>` — filter LIKE nama/unit/nip
  - `add_anggota(input:AnggotaInput) -> Anggota` — validasi nama/unit wajib
  - `update_anggota(id, input) -> Anggota`
  - `delete_anggota(id) -> string` (soft delete status_aktif=0)
  - `get_saldo() -> i64` = SUM masuk - keluar
- `src-tauri/src/lib.rs:1` setup `init_db` di `.setup()`, `app.manage(DbState)` + `generate_handler![...]` (butuh `use tauri::Manager`)
- `cargo check` PASS (483 crates), `npm run build` PASS

### Cara Pakai Command dari React (contoh):

```ts
import { invoke } from "@tauri-apps/api/core";
const anggota = await invoke<Anggota[]>("get_anggota", {
  search: "Budi",
  statusAktif: true,
});
const baru = await invoke<Anggota>("add_anggota", {
  input: {
    nama: "Budi",
    unit_kerja: "SDN 1",
    nip_nuptk: null,
    no_hp: null,
    status_aktif: true,
  },
});
const saldo = await invoke<number>("get_saldo");
```

### 6. Halaman Anggota — CRUD UI Lengkap (2026-09-10)

- Deps baru: `@tanstack/react-table`, `@radix-ui/react-dialog` (Dialog shadcn)
- Components: `src/components/ui/dialog.tsx:1`, `src/components/ui/textarea.tsx:1`
- `src/pages/Anggota.tsx:1` rewrite penuh:
  - Fetch `get_anggota(search, statusAktif)` via `invoke` + debounce 350ms + filter All/Aktif/Nonaktif
  - Tabel shadcn (No, Nama, Unit, NIP, No HP, Badge Aktif/Nonaktif, Aksi Edit/Nonaktifkan)
  - Dialog form Tambah/Edit: validasi nama & unit_kerja wajib, checkbox status_aktif, error inline
  - Invoke `add_anggota`, `update_anggota`, `delete_anggota` (soft delete) + update state lokal
  - Mode preview browser: fallback mock 3 data + banner kuning bila `invoke` gagal (dev tanpa Tauri)
  - Loading/empty state, refresh button
- `npm run build` PASS (282 kB JS, 27 kB CSS), `cargo check` PASS

### 7. Autentikasi Sederhana (2026-09-10)

- Rust: `src-tauri/Cargo.toml:27` tambah `bcrypt 0.17`
- `src-tauri/src/models/mod.rs:63` struct `UserPublic`, `UserInput`, `LoginInput`
- `src-tauri/src/commands/auth.rs:1` commands:
  - `login(username:string, password:string) -> UserPublic` — bcrypt verify
  - `get_users() -> Vec<UserPublic>`
  - `create_user(input:UserInput) -> UserPublic` — hash bcrypt cost 10, validasi role
  - `delete_user(id) -> string` (minimal 1 user tersisa)
  - `change_password(id, old_password, new_password) -> string`
- `src-tauri/src/db/mod.rs:19` seed default admin `admin/admin123` jika users kosong (bcrypt hash runtime)
- `src-tauri/src/commands/mod.rs:2` export `auth`, `src-tauri/src/lib.rs:23` register 5 commands auth
- Frontend:
  - `src/context/AuthContext.tsx:1` — Context + localStorage `kas_forum_user`, `login()` via `invoke("login")` + fallback mock admin/admin123 untuk vite dev
  - `src/pages/Login.tsx:1` — Card login gradient, error inline, hint default credentials
  - `src/pages/Pengaturan.tsx:1` — Tabel users, badge role, tambah user (dialog), hapus user, guard hanya admin, mock fallback
  - `src/components/layout/Sidebar.tsx:1` — tampil user + role + tombol Keluar, `useAuth()`
  - `src/App.tsx:1` — guard `loading ? ... : !user ? <Login/> : <Sidebar+pages>`, viewer tidak bisa buka Pengaturan, `src/main.tsx:5` wrap `AuthProvider`
- Build: `npm run build` PASS (294 kB JS), `cargo check` PASS

### 8. Input Iuran Bulanan — Bulk (2026-09-10)

- `src-tauri/src/models/mod.rs:86` struct `IuranStatus { anggota, pembayaran?, sudah_bayar }`, `BulkBayarInput`
- `src-tauri/src/commands/iuran.rs:1` 6 commands:
  - `get_periode_list() -> Vec<PeriodeIuran>` ORDER tahun,bulan DESC
  - `get_or_create_periode(bulan, tahun, nominal_wajib?) -> PeriodeIuran` (INSERT OR IGNORE + UPDATE nominal jika explicit)
  - `update_periode_nominal(periode_id, nominal_wajib) -> PeriodeIuran`
  - `get_iuran_status(periode_id) -> Vec<IuranStatus>` — join anggota aktif + pembayaran (LEFT)
  - `bayar_iuran_bulk(input: BulkBayarInput) -> Vec<PembayaranIuran>` — loop insert `pembayaran_iuran` + auto insert `kas_transaksi` tipe masuk kategori 1, UNIQUE constraint cegah double bayar
  - `hapus_pembayaran(pembayaran_id) -> string` — hapus kas_transaksi ref + pembayaran (batalkan)
- `src-tauri/src/commands/mod.rs:3` export iuran, `src-tauri/src/lib.rs:30` register 6 commands
- Frontend `src/pages/Iuran.tsx:1`:
  - Picker bulan (1-12) + tahun + nominal + "Buka Periode" → `get_or_create_periode`
  - Riwayat periode chips, cards ringkasan (Aktif/Sudah/Belum/Terkumpul `formatRupiah`)
  - Search filter, checkbox per anggota (disable jika sudah lunas), "Pilih semua belum bayar"
  - Bulk form: tanggal_bayar (default today) + metode (tunai/transfer) + tombol Bayar (n\*nominal + count)
  - Tabel status: Badge Lunas/Belum, tgl bayar, aksi Batalkan → `hapus_pembayaran`
  - Update nominal inline, fallback mock 3 anggota saat vite dev tanpa Tauri
- `src/App.tsx:4` import `Iuran`, route `iuran` → `<Iuran/>`
- Build: `npm run build` PASS (305 kB JS), `cargo check` PASS

### 9. Transaksi Kas (2026-09-10)

- `src-tauri/src/models/mod.rs:103` struct `KasTransaksiView` (join kategori_nama), `KasInput`
- `src-tauri/src/commands/kas.rs:1` 7 commands:
  - `get_kategori_list() -> Vec<KategoriTransaksi>`
  - `add_kategori(nama, tipe) -> KategoriTransaksi`, `delete_kategori(id)` (cegah hapus Iuran & kategori terpakai)
  - `get_kas_transaksi(tipe?, kategori_id?, dari?, sampai?, limit?) -> Vec<KasTransaksiView>` LEFT JOIN kategori, filter & limit
  - `add_kas_transaksi(input: KasInput) -> KasTransaksiView` validasi kategori, cegah saldo minus jika keluar
  - `delete_kas_transaksi(id)` cegah hapus transaksi iuran (referensi_pembayaran_id NOT NULL)
  - `get_saldo_detail() -> {saldo,total_masuk,total_keluar,masuk_bulan,keluar_bulan}`
- `src-tauri/src/commands/mod.rs:4` export kas, `src-tauri/src/lib.rs:41` register 7 commands
- Frontend `src/pages/Transaksi.tsx:1`:
  - Header saldo live + tombol Tambah (Dialog: tipe keluar/masuk, kategori filter per tipe, tanggal, nominal `formatRupiah`, keterangan, validasi saldo)
  - Filter riwayat: All/Masuk/Keluar + dari/sampai date, tabel Badge tipe, kategori, keterangan, nominal (+/-), aksi hapus (block jika iuran)
  - Fallback mock 2 rows + saldo mock saat vite dev
- `src/App.tsx:5` import `Transaksi`, route `transaksi` → `<Transaksi/>`
- Build: `npm run build` PASS (315 kB JS), `cargo check` PASS

### 10. Dashboard (2026-09-10)

- `src-tauri/src/commands/dashboard.rs:1` 2 commands:
  - `get_dashboard_stats() -> {saldo,total_masuk,total_keluar,masuk_bulan,keluar_bulan,anggota_aktif,belum_bayar,tren[12]}` tren query per YYYY-MM `substr(tanggal,1,7)`
  - `get_tunggakan_list() -> [{id,nama,unit_kerja}]` anggota aktif yang belum bayar periode bulan berjalan
- `src-tauri/src/commands/mod.rs:5` export dashboard, `src-tauri/src/lib.rs:48` register
- Deps: `recharts`, `xlsx`, `jspdf`, `jspdf-autotable` (5.0.8)
- `src/pages/Dashboard.tsx:1` rewrite:
  - Cards: Saldo (primary border), Masuk/Keluar bulan ini, Tunggakan (anggota_aktif/belum)
  - LineChart Recharts 12 bulan (masuk hijau 16a34a, keluar merah dc2626) + BarChart saldo 6 bulan + tabel tunggakan (max 15) + fallback mock

### 11. Laporan (2026-09-10)

- `src/pages/Laporan.tsx:1` — filter `dari/sampai/tipe` → `invoke("get_kas_transaksi")`, cards Total Masuk/Keluar/Saldo, tabel hasil
  - Export Excel via `xlsx` (`XLSX.utils.json_to_sheet` + `writeFile`), PDF via `jspdf` + `jspdf-autotable` (header, body, foot total), CSV blob
  - Rentang default bulan berjalan, hint Google Sheets CSV

### 12. Pengaturan Final (2026-09-10)

- `src/pages/Pengaturan.tsx:1` tambah `KategoriSection` — list kategori pill + Badge tipe, tambah/hapus (admin only, cegah hapus Iuran), `get_kategori_list`/`add_kategori`/`delete_kategori`
- `src/App.tsx:1` routing lengkap 6 halaman: Dashboard/Anggota/Iuran/Transaksi/Laporan/Pengaturan, `Laporan.tsx` import, viewer blokir Pengaturan
- Build: `npm run build` PASS (1.43 MB JS termasuk xlsx/jspdf, chunk warning), `cargo check` PASS — semua 8 fitur prompt utama selesai
- Total commands Rust: 5 anggota + 5 auth + 6 iuran + 7 kas + 2 dashboard = 25 + greet

### Catatan Isu:

- `prompt-aplikasi-kas-forum-pppk.md` ter-restore, jangan gunakan `--force` lagi tanpa backup
- Vite warning `__dirname` tidak fatal, build tetap sukses
- Database file: `%APPDATA%/com.forumpppk.kas/kas.db` (Windows) — aman saat update app

### 13. Audit & Perbaikan Final (2026-09-10)

#### Impor Anggota

- `bulk_import_anggota` command sudah ada di `commands/anggota.rs:177` — loop row, validasi 4 kolom wajib, INSERT, return `{sukses, gagal, total}` JSON
- Template download + modal impor + preview tabel + hasil impor sudah lengkap di `Anggota.tsx`
- **Bug fix**: `lib.rs` mendaftarkan `bulk_import_anggota` dua kali (baris 30 & 53 lama). Duplikat dihapus.

#### Riwayat Kegiatan

- Tabel `riwayat_kegiatan` di `migration.rs:70-76` (id, waktu, username, aksi, detail)
- Commands `riwayat.rs`: `tulis_riwayat`, `get_riwayat` (filter dari/sampai/aksi/cari/limit), `hapus_riwayat_lama` (>6 bulan), `hapus_semua_riwayat`
- Halaman `Riwayat.tsx`: filter grid 5 kolom, export Excel, hapus lama/semua, tabel, fallback mock
- Route sudah aktif di `App.tsx:35` dan sidebar `Sidebar.tsx:17`

#### Cadangan

- Commands `cadangan.rs`: `buat_cadangan`, `pulihkan_cadangan`, `daftar_cadangan`, `info_cadangan`
- `CadanganSection` di `Pengaturan.tsx:270-323`: info DB, Buat/Pulihkan/Muat Ulang

#### Verify Build

- `cargo check` PASS — Finished dev profile in 4.85s
- `npm run build` PASS — ✓ 2704 modules, 1608 KB JS, built in 1.30s
- Total commands terdaftar di `lib.rs`: 30 (greet + 5 anggota + 5 auth + 8 iuran + 7 kas + 2 dashboard + 4 riwayat + 4 cadangan)

### 14. Plugin Dialog Native + Cetak Daftar Lunas (2026-09-10)

#### tauri-plugin-dialog (File Picker Native)

- `npm install @tauri-apps/plugin-dialog` + `cargo add tauri-plugin-dialog`
- `lib.rs`: `.plugin(tauri_plugin_dialog::init())`
- `capabilities/default.json`: tambah `"dialog:default"` ke permissions
- `Pengaturan.tsx`: fungsi `pulihkan()` kini buka native OS file picker (filter `*.db`) via `dialogOpen()` dari plugin. Fallback ke `prompt()` otomatis jika bukan Tauri (browser dev).

#### Cetak Daftar Lunas (Checklist.tsx)

- Rewrite `Checklist.tsx`:
  - **Tombol Cetak**: buka popup `window.open()` dengan HTML+CSS print-friendly, `@page { size: A4 landscape }`, header judul+tanggal+ringkasan, tabel anggota semua bulan, kolom total, area tanda tangan bendahara, footer → `win.print()`
  - **Tombol Unduh Excel**: `xlsx` aoa_to_sheet dengan header+12 bulan+total, format kolom, simpan `daftar-iuran-{tahun}.xlsx`
  - **4 kartu ringkasan**: Total Anggota / Lunas 12 Bln / Bayar Sebagian / Belum Bayar
  - **Sub-angka per kolom bulan**: tiap header bulan tampil `X/total` (hijau jika semua sudah bayar)
  - Baris hijau muda = lunas 12 bln, merah muda = belum sama sekali
- Build: `cargo check` PASS (1.55s) + `npm run build` PASS — ✓ 2705 modules, 1615 KB

### 15. Pemeriksaan Layout & Halaman Petunjuk Penggunaan (2026-09-10)

#### Perbaikan Layout yang Kurang Pas:

1. **Index CSS (@import order)**: Pindahkan `@import url('https://fonts.googleapis.com/css2?...');` ke baris paling awal dan hapus duplikat di tengah file. Warning Vite build pada CSS berhasil dihilangkan 100%.
2. **Ukuran Jendela Aplikasi (`tauri.conf.json`)**: Diperbesar dari `800x600` menjadi `1280x800` (min `960x600`, center: true) sehingga layout 2 panel (sidebar + konten utama) tidak lagi tertekan/gepeng saat pertama dibuka.
3. **Sidebar Modern & Konsisten (`Sidebar.tsx`)**:
   - Ditambahkan ikon Lucide untuk seluruh menu: Beranda (`LayoutDashboard`), Anggota (`Users`), Kas (`Wallet`), Daftar Lunas (`CheckSquare`), Laporan (`BarChart2`), Riwayat (`History`), Petunjuk (`BookOpen`), Pengaturan (`Settings`).
   - Lebar disesuaikan ke `w-56` (224px) dengan `overflow-y-auto` agar fleksibel di layar kecil.
4. **Tombol Header Beranda (`Dashboard.tsx`)**:
   - Tombol "Muat Ulang" diperbarui menggunakan komponen `Button` dengan ikon `RefreshCw` dan styling putih kontras (`bg-white text-[#667eea] shadow`), konsisten dengan halaman Anggota & Daftar Lunas.
5. **Tombol Header Transaksi (`Transaksi.tsx`)**:
   - Tombol "Tambah Pengeluaran" diperbarui dengan styling kontras tinggi (`bg-white text-[#667eea] shadow`) agar tidak tenggelam di atas latar gradient.
6. **Ikon Ganda Tombol Cari Laporan (`Laporan.tsx`)**:
   - Diperbaiki kondisi render ikon tombol Tampilkan agar hanya menampilkan `Loader2` saat memuat dan `Search` saat idle.

#### Halaman Petunjuk Penggunaan (`Petunjuk.tsx`):

- Dibuat halaman panduan pengguna komprehensif berformat accordion interaktif:
  - **8 Panduan Per Fitur**: Masuk Aplikasi, Beranda, Anggota, Kas, Daftar Lunas, Laporan, Riwayat, Pengaturan.
  - **10 Pintasan Aksi Cepat**: Kartu instruksi cepat untuk tugas harian bendahara/admin.
  - **FAQ (Pertanyaan Umum)**: 7 tanya-jawab seputar lokasi penyimpanan data lokal (%APPDATA%), saldo kas, iuran multi-bulan, backup/restore, dll.
  - **Info Aplikasi**: Rincian versi, arsitektur data 100% lokal, dan pengingat backup rutin.
- Didaftarkan ke routing `App.tsx` dan navigasi `Sidebar.tsx`.

#### Verifikasi Build Akhir:

- `npm run build` PASS (tsc + vite build tanpa warning CSS, 0 error, 2706 modules)
- `cargo check` PASS (dev profile target)

### 16. Layout Full Width & Full Screen Desktop (`App.tsx` & `Sidebar.tsx`) (2026-09-10)

- **Penyebab tampilan tidak full**: Sebelumnya pembungkus halaman di `App.tsx` dibatasi oleh `max-w-5xl` (hanya 1024px) dengan `mx-auto`, sehingga di layar laptop/monitor lebar (1366px, 1600px, 1920px) terdapat ruang kosong lebar di kiri dan kanan, serta tabel panjang seperti Checklist 12 bulan dan Anggota menjadi sempit.
- **Perbaikan**:
  - `App.tsx`: Mengubah kontainer dari `max-w-5xl mx-auto` menjadi `w-full` agar memanfaatkan 100% lebar layar yang tersedia.
  - Mengubah layout aplikasi menjadi desktop-ready: `flex h-screen w-screen overflow-hidden`.
  - Konten utama `main` menjadi `flex-1 h-full overflow-y-auto p-6 md:p-8`, sehingga konten scroll sendiri secara mandiri.
  - `Sidebar.tsx`: Ditambahkan `h-full` agar sidebar selalu menempel penuh dari atas sampai bawah layar.
- **Hasil**: Halaman kini tampil penuh (full width), tabel Daftar Lunas 12 bulan tidak lagi terpotong/sempit, grafik Beranda melebar proporsional, dan tampilan aplikasi menyerupai aplikasi desktop profesional.

### 17. Penyesuaian Tema Halaman Login & Penempatan Nama Pengembang (2026-09-10)

- **Pemeriksaan & Penyempurnaan Tema Halaman Login (`Login.tsx`)**:
  - Latar belakang gradien tetap serasi dengan tema aplikasi (`linear-gradient(135deg, #667eea 0%, #764ba2 100%)`).
  - Kartu login ditingkatkan menjadi bergaya modern/glassmorphic (`rounded-2xl shadow-2xl border border-white/30 bg-white/95 backdrop-blur-md`) dengan aksen garis gradien di bagian atas.
  - Ikon dompet dipercantik dengan bayangan glow ungu (`shadow-lg shadow-indigo-500/30`).
  - Tombol masuk diperbarui menggunakan tombol gradien elegan (`bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:opacity-95 shadow-md shadow-indigo-500/25`) senada dengan tombol simpan di halaman Kas.
- **Penempatan Nama Pengembang (`IrfanDev97`)**:
  Nama pengembang telah ditempatkan secara profesional dan proporsional di 4 lokasi strategis:
  1. **Halaman Login (`Login.tsx`)**: Di bagian footer bawah kartu login — _"Aplikasi Kas Forum PPPK • v0.1.0 • Dikembangkan oleh IrfanDev97"_.
  2. **Sidebar Aplikasi (`Sidebar.tsx`)**: Di footer bawah tombol keluar — _"v0.1.0 • IrfanDev97"_.
  3. **Halaman Pengaturan (`Pengaturan.tsx`)**: Di dalam Card "Tentang Aplikasi" — _"Pengembang: IrfanDev97"_.
  4. **Halaman Petunjuk (`Petunjuk.tsx`)**: Di dalam Card "Informasi Aplikasi" — _"Pengembang: IrfanDev97"_.
- **Verifikasi Build**:
  - `npm run build`: PASS (0 error, build time 1.24s).
  - `cargo check`: PASS (`Finished dev profile in 0.83s`).

### 18. Tombol Log Out Tambahan (`App.tsx` & `Pengaturan.tsx`) (2026-09-10)

- **Top Header Bar Global (`App.tsx`)**:
  - Ditambahkan bilah navigasi atas (_top bar_) bernuansa _glassmorphic_ yang selalu terlihat di **seluruh halaman**.
  - Sisi kiri menampilkan judul/breadcrumb halaman yang sedang aktif (Beranda, Anggota, Kas, Daftar Lunas, Laporan, Riwayat, Petunjuk, Pengaturan).
  - Sisi kanan menampilkan status pengguna (`● {nama} (@{username} • {role})`) dan tombol **"Keluar"** berikon `LogOut` dengan transisi hover merah yang elegan.
- **Tombol Keluar di Header Pengaturan (`Pengaturan.tsx`)**:
  - Ditambahkan tombol **"Keluar dari Akun"** di samping judul halaman Pengaturan untuk kemudahan akses administrator/pengurus.
- **Hasil**:
  - Pengguna kini memiliki 3 opsi mudah untuk keluar:
    1. Melalui **Top Header Bar** di bagian atas (dapat diakses dari halaman mana saja secara instan).
    2. Melalui **Header Halaman Pengaturan**.
    3. Melalui **Bagian Bawah Sidebar Navigasi**.
- **Verifikasi Build**:
  - `npm run build`: PASS (0 error, build time 1.45s).
  - `cargo check`: PASS (`Finished dev profile in 0.79s`).

### 19. Profil Forum Dinamis + Pimpinan & Logo + Tanda Tangan 3 Kolom (2026-09-11)

- **Schema DB**: `migration.rs:79` tabel `profil_organisasi` singleton `CHECK(id=1)` kolom `nama_forum, alamat, deskripsi, ketua_nama/nip, sekretaris_nama/nip, bendahara_nama/nip, logo_base64, updated_at` + seed `INSERT OR IGNORE`.
- **Models**: `models/mod.rs:153` `ProfilOrganisasi` + `ProfilInput`.
- **Commands**: `commands/profil.rs:1` `get_profil()` & `update_profil(input)` (validasi nama_forum wajib, logo 700k chars ~500KB, `data:image/`).
- **Migrasi DB Lama**: `db/mod.rs:19` 9× `ALTER ADD` + `INSERT OR IGNORE`.
- **Frontend Pengaturan**: `Pengaturan.tsx:586` `ProfilForumSection` di atas KategoriSection — field nama_forum\*, alamat, deskripsi, 3 card Ketua/Sekretaris/Bendahara (nama+NIP), logo upload preview <500KB opsional, `invoke("update_profil")`, guard admin only, fallback mock vite.
- **Integrasi Cetak**: `Checklist.tsx:96 handlePrint` async fetch `get_profil`, kop logo+nama+alamat, escape HTML, ttd 3 kolom `space-between` dengan NIP; `handleExcel` tambah kop + ttd. `Laporan.tsx:141 exportPDF` kop + logo `addImage` + 3 ttd NIP, `exportExcel` kop + ttd.
- **Branding Dinamis**: `Sidebar.tsx:49` & `Login.tsx:15` `namaForum` dari `get_profil()` (fallback Forum PPPK).
- **Build**: `npm run build` PASS (1.53s) fix `replaceAll`→regex, `cargo check` PASS.

### 20. Pagination Tabel + Cetak Full (2026-09-11)

- **Komponen**: `src/components/ui/pagination-controls.tsx:1` reusable `PaginationControls` (First/Prev/Next/Last, 10/25/50/100 per halaman, info `Menampilkan X–Y dari Z`).
- **Integrasi**: `Anggota.tsx:139` 10/hal, `Checklist.tsx:87` 25/hal `filtered` + `pagedFiltered`, `Iuran.tsx:121` 10/hal, `Laporan.tsx:42` 25/hal, `Transaksi.tsx:81` 10/hal, `Riwayat.tsx:21` 25/hal.
- **Cetak Tetap Full**: `Checklist.tsx:119` `handlePrint/handleExcel` pakai `filtered` full, `Laporan.tsx:115 exportExcel/164 exportPDF/210 CSV` pakai `data` full, `Riwayat.tsx:41` pakai `data` full — hanya UI yang dipaginate.
- **Build**: `npm run build` PASS (2708 modules 1.41s), `cargo check` PASS.

### 21. Viewer Bukti & Lampiran Lampiran Laporan (2026-09-11)

- **Viewer Bukti**: `Transaksi.tsx:466` thumbnail 32px → `Dialog buktiView` besar (image `max-h-[70vh]` / PDF `iframe`, tombol Unduh); `Iuran.tsx:558` sama untuk `bukti_transfer`; `Laporan.tsx:381` tambah kolom `Bukti` + modal viewer (sebelumnya tidak ada).
- **Tanya Jawab**: Print awal tidak include gambar (boros, base64 3MB). Opsi C dipilih: lampiran hanya di Laporan.
- **Lampiran Laporan**: `Laporan.tsx:322` checkbox `Sertakan lampiran bukti di PDF` (default OFF, tampil count `n bukti`), `Laporan.tsx:220 exportPDF` setelah 3 ttd loop `withBukti = data.filter(d=>d.bukti)` → `addPage` judul `Lampiran Bukti`, per bukti `90×55` image + garis, auto paginasi, confirm jika >30 bukti, PDF file skip image (text placeholder).
- **Build**: `npm run build` PASS (1.35s, fix `setFont` type), contoh dummy `dist/contoh-laporan.pdf` 2 halaman.
- **Catatan Vite vs Tauri**: `vite dev` (`npm run dev`) = mock statis pratinjau, tidak tulis `kas.db`; Tauri (`npm run tauri dev`/`build`) = dinamis SQLite `%APPDATA%/com.forumpppk.kas/kas.db` mulai nol, seed `admin/admin123`. Opsi A dipilih (tetap mock tanpa `localStorage`).

### 22. Pembuatan Logo Resmi Aplikasi & Buku Panduan PDF (2026-09-11)

#### 1. Logo Resmi & Ikon Tauri (`src-tauri/icons`)

- **Konsep Logo**:
  - Simbol 3D glassmorphic dompet digital berkilau dengan tameng emas (keamanan kas) dan koin emas dengan panah pertumbuhan keuangan ke atas.
  - Latar belakang squircle modern dengan gradien ungu-indigo serasi (`#667eea` s/d `#764ba2`).
  - File master tersimpan di `public/app-logo.png`.
- **Eksekusi Ikon Tauri Otomatis**:
  - Dijalankan perintah `@tauri-apps/cli icon public/app-logo.png`.
  - Berhasil membangkitkan paket lengkap ikon di folder `src-tauri/icons/`:
    - `icon.ico` (resolusi multi-layer Windows desktop & taskbar).
    - `icon.icns` (resolusi macOS).
    - `32x32.png`, `64x64.png`, `128x128.png`, `128x128@2x.png`, `icon.png` (Linux & standard window).
    - Paket lengkap ikon Appx (StoreLogo, Square150x150, Square310x310, dll.), iOS, dan Android mipmap.
- **Penerapan Logo di Antarmuka Pengguna (UI)**:
  - **Halaman Login (`Login.tsx`)**: Menampilkan logo resmi 64x64 pada header kartu login dengan efek bayangan dan border halus.
  - **Header Sidebar (`Sidebar.tsx`)**: Menampilkan thumbnail logo 40x40 di samping nama forum.

#### 2. Buku Panduan Penggunaan Lengkap (Format PDF)

- **File PDF Dihasilkan**:
  - Tersimpan di root proyek: `Panduan_Penggunaan_Aplikasi_Kas_Forum_PPPK.pdf` (Ukuran: ~3.2 MB, 8 Halaman A4 Lengkap).
  - Tersedia di folder `public/` untuk diunduh langsung dari aplikasi.
- **Struktur Isi Buku Panduan**:
  1. **Halaman Sampul (Cover)**: Banner gradien ungu, logo aplikasi resmi, judul dokumen, metadata versi 0.1.0, nama pengembang IrfanDev97, dan tanggal rilis.
  2. **1.0 Daftar Isi & 2.0 Pendahuluan**: Penjelasan arsitektur 100% offline & lokal (SQLite di `%APPDATA%`), prinsip single-source-of-truth saldo kas, kredensial login awal (`admin / admin123`).
  3. **3.0 Akses Masuk & 4.0 Halaman Beranda**: Hak akses peran (Admin, Bendahara, Viewer), 4 kartu metrik kas, grafik tren 12 bulan & sisa kas 6 bulan, daftar tunggakan, 5 transaksi terkini.
  4. **5.0 Manajemen Data Anggota**: Tambah anggota, edit, soft-delete (nonaktifkan tanpa hilang histori), format dan prosedur impor massal Excel.
  5. **6.0 Pencatatan Kas Masuk (Iuran)**: Prosedur bayar 1 s/d 12 bulan sekaligus, deteksi cegah bayar ganda, pembayaran tunai/transfer struk, dan fitur bayar rame-rame saat rapat forum.
  6. **7.0 Daftar Lunas Tahunan (Checklist) & Cetak**: Cara membaca kisi-kisi 12 bulan (✓ hijau & —), pencetakan fisik A4 Landscape dengan kop resmi dan kolom tanda tangan bendahara, ekspor Excel.
  7. **8.0 Pencatatan Pengeluaran & 9.0 Laporan Keuangan**: Input belanja/biaya organisasi, proteksi saldo minus (defisit guard), ekspor PDF/Excel/CSV.
  8. **10.0 Riwayat Kegiatan (Audit Trail) & 11.0 Pengaturan / Backup-Restore**: SOP pencadangan rutin file .db dan pemulihan data via native file dialog.
  9. **12.0 Tanya Jawab Umum (FAQ) & Lembar Penutup**: Solusi kendala umum dan tanda tangan pengembang IrfanDev97.
- **Tombol Unduh di Aplikasi**:
  - Pada halaman **Petunjuk Penggunaan (`Petunjuk.tsx`)** ditambahkan tombol _"Unduh Buku Panduan (PDF)"_ di header atas.
- **Verifikasi Build**:
  - `npm run build`: PASS (0 error, build time 1.44s).
  - `cargo check`: PASS (`Finished dev profile in 1.03s`).

### 23. FAQ Pindah Laptop & Alur Pulihkan Backup (2026-09-11)
- **Petunjuk**: `Petunjuk.tsx:230` tambah step 6 `Pindah Laptop` di section Pengaturan (Buat Cadangan → copy `kas-*.db` → instal baru → login `admin/admin123` → Pulihkan dari File → `PULIHKAN` → restart), tambah FAQ #8 `Pindah laptop — bawa data lama bagaimana?` (copy dari `backup` `%APPDATA%\com.forumpppk.kas\backup`).
- **Backend**: `cadangan.rs:41` `pulihkan_cadangan` checkpoint WAL, backup `kas-sebelum-pulih-*.db`, copy `src→kas.db`, hapus `wal/shm`, replace `DbState`, tulis riwayat `Pulihkan Data`.
- **Alur Baru**: Instal fresh → login default → Pengaturan → Pulihkan (bukan login data lama dulu). Setelah pulih login pakai akun dari backup.
- **Build**: `npm run build` PASS (1.44s).

### 24. Perbaikan ProductName & Kesiapan Installer + Push GitHub (2026-09-12)
- **ProductName**: `src-tauri/tauri.conf.json:3` `tauri-app` → `Aplikasi Kas Forum PPPK`, `package.json:2` → `aplikasi-kas-forum-pppk`, `Cargo.toml:4` description `IrfanDev97`.
- **Toolchain**: `winget install WiXToolset.WiXToolset 3.14.1.8722` (candle.exe) + `NSIS.NSIS 3.12` (makensis.exe), PATH permanen User, `npx tauri info` OK WebView2 152 + rustc 1.97.
- **Build Awal**: `npm run build` PASS 2708 modules 1.27s, `cargo check` PASS, `tauri build` 12m40s → MSI 6.27 MB + NSIS 5.36 MB + exe 9.3 MB di `src-tauri/target/release/bundle/`.
- **Git**: `git init`, `.gitignore` tambah `src-tauri/target`, `*.db`, `backup`, `.vscode/settings.json` allow, commit `d5f8bae` 121 files push `main` → `https://github.com/Mukhamadirfan1997/Aplikasi-Kas-forum.git`.

### 25. Fix tsconfig.json Merah (2026-09-12)
- **Penyebab**: `tsconfig.json:28` `ignoreDeprecations: "6.0"` hanya dikenal TS 6.0.3, VSCode 1.102 bundle TS 5.8 → merah walau `tsc --noEmit` PASS.
- **Fix**: `.vscode/settings.json:1` `typescript.tsdk: node_modules/typescript/lib` + `enablePromptUseWorkspaceTsdk`, `.gitignore:17` whitelist `!.vscode/settings.json`, commit `45a57c3` push.

### 26. Patch Cetak & Unduh di Tauri WebView (2026-09-12)
- **Root Cause**: `Checklist.tsx:202` `window.open` diblokir WebView2 → `null` → alert popup; `XLSX.writeFile`/`doc.save`/`Blob+a.click` di 7 lokasi mengandalkan browser download → diam di Tauri tanpa `fs`.
- **Fix Infra**: `npm i @tauri-apps/plugin-fs@2` + `cargo add tauri-plugin-fs`, `src-tauri/src/lib.rs:18` `.plugin(tauri_plugin_fs::init())`, `capabilities/default.json:6` `fs:allow-write-file`, `fs:scope-*` (download/document/desktop/temp/home/appdata).
- **Helper**: `src/lib/fileSave.ts:1` baru `isTauri()` cek `__TAURI__/__TAURI_INTERNALS__/__TAURI_IPC__`, `saveWithDialogOrAnchor` → Tauri `dialog.save` + `fs.writeFile` else anchor Blob; `saveXlsx`, `savePdfArrayBuffer`, `saveCsvText`, `saveDataUrl` (base64 decode), `saveAssetPdf` (fetch).
- **Checklist**: `Checklist.tsx:7` import `saveXlsx`, `handlePrint:202` ganti `window.open` → iframe hidden `contentWindow.print()` + fallback save HTML, `handleExcel:260` → `await saveXlsx`.
- **Laporan**: `Laporan.tsx:20` import `saveXlsx/savePdfArrayBuffer/saveCsvText`, `exportExcel:142` → `saveXlsx`, `exportPDF:268` → `doc.output(arraybuffer)` + `savePdfArrayBuffer`, `exportCSV:273` → `saveCsvText`, dialog bukti tambah tombol Unduh via `saveDataUrl`.
- **Lainnya**: `Riwayat.tsx:11` + `Anggota.tsx:13` `saveXlsx` template, `Petunjuk.tsx:302` `handleDownloadPDF` → `saveAssetPdf`, `Transaksi.tsx:24` + `Iuran.tsx:594` bukti `a download` → `saveDataUrl` Button.
- **Build**: `npm run build` PASS 2711 modules 1.37s, `cargo check` fix `fs:allow-write-file`/`path:default` typo, `tauri build` 10m42s → MSI 6.39 MB + NSIS 5.45 MB.

### 27. Dashboard Pagination + Login Persist (2026-09-12)
- **Dashboard**: `Dashboard.tsx:16` import `PaginationControls`, `tPage/tPageSize` state, `tPaged = tunggakan.slice(...)`, UI ganti `slice(0,15)` + `+N` → `PaginationControls` 10/hal (sebelumnya belum ada pagination).
- **Login Persist**: `src/context/AuthContext.tsx:27` sebelumnya hanya `localStorage` → hilang saat WebView clear. Sekarang dual persist: `persist()` tulis `localStorage` + `appDataDir/session.json` via `writeTextFile`, `clearPersist()` hapus keduanya, `useEffect` fallback baca `readTextFile` jika `localStorage` kosong. `capabilities/default.json:6` tambah `fs:allow-read-text-file`, `fs:allow-remove`, `fs:allow-mkdir`, `core:path:default`, `fs:scope-appconfig-recursive`.
- **Build & Install**: `npm run build` PASS 1.43s, `cargo check` PASS 3.76s, `tauri build` 9m36s → MSI 6.39 MB reinstall `C:\Program Files\Aplikasi Kas Forum PPPK\tauri-app.exe` 10.2 MB PID 52948, install MSI `exit 0`.
- **Status**: App terinstall, window `Aplikasi Kas Forum PPPK`, DB `C:\Users\yudhi\AppData\Roaming\com.forumpppk.kas\kas.db` persist, tutup-buka tidak minta login lagi.
