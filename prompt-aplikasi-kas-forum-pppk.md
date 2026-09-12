# Prompt untuk AI Coding Assistant — Aplikasi Kas Organisasi Forum PPPK

Gunakan prompt di bawah ini sebagai instruksi awal ke AI assistant di code editor kamu (Cursor, Copilot Chat, Claude Code, dll).

---

## PROMPT

Saya ingin membuat aplikasi desktop untuk mengelola kas organisasi Forum PPPK. Tolong bantu saya membangun proyek ini dari awal dengan spesifikasi berikut:

### Tech Stack
- **Shell desktop**: Tauri v2
- **Frontend**: React (Vite) + TypeScript
- **Styling**: Tailwind CSS
- **Komponen UI**: shadcn/ui
- **Backend logic**: Rust (native command Tauri, bukan Laravel/PHP)
- **Database**: SQLite lokal (pakai `rusqlite` atau `sqlx` dengan fitur sqlite), file database disimpan di app data directory milik user (bukan folder instalasi), supaya aman saat aplikasi di-update.
- **Chart**: Recharts atau Chart.js untuk visualisasi saldo kas
- **Table**: TanStack Table untuk tabel data anggota, iuran, dan transaksi

### Konteks Aplikasi
Aplikasi ini dipakai oleh bendahara forum untuk mencatat:
1. Data anggota forum
2. Iuran bulanan wajib (default Rp10.000/anggota/bulan, tapi nominal per periode harus bisa diubah dari pengaturan)
3. Transaksi kas keluar (pengeluaran organisasi)
4. Laporan saldo kas dan rekap tunggakan

### Skema Database (SQLite)

Buatkan migration/schema untuk tabel berikut:

```
anggota
- id (PK)
- nama
- nip_nuptk (nullable)
- unit_kerja
- no_hp (nullable)
- status_aktif (boolean, default true)
- created_at, updated_at

periode_iuran
- id (PK)
- bulan (int, 1-12)
- tahun (int)
- nominal_wajib (default 10000)
- created_at

pembayaran_iuran
- id (PK)
- anggota_id (FK -> anggota)
- periode_id (FK -> periode_iuran)
- tanggal_bayar
- nominal
- metode ('tunai' | 'transfer')
- keterangan (nullable)
- created_at

kategori_transaksi
- id (PK)
- nama (misal: Konsumsi, ATK, Kegiatan, Lain-lain)
- tipe ('masuk' | 'keluar')

kas_transaksi
- id (PK)
- tipe ('masuk' | 'keluar')
- kategori_id (FK -> kategori_transaksi, nullable)
- nominal
- tanggal
- keterangan
- referensi_pembayaran_id (FK -> pembayaran_iuran, nullable — diisi otomatis kalau transaksi berasal dari input iuran)
- created_at

users
- id (PK)
- nama
- username
- password_hash
- role ('admin' | 'bendahara' | 'viewer')
- created_at
```

Catatan penting: **saldo kas TIDAK disimpan sebagai kolom statis**. Saldo harus selalu dihitung dari SUM(kas_transaksi masuk) - SUM(kas_transaksi keluar) supaya tidak ada data yang tidak sinkron kalau ada transaksi yang diedit/dihapus.

### Fitur yang Harus Dibangun (urutkan sesuai prioritas ini)

1. **Setup awal**: struktur project Tauri + React + TypeScript + Tailwind + shadcn/ui, koneksi ke SQLite, migration otomatis jalan saat aplikasi pertama kali dibuka.
2. **Autentikasi sederhana**: login dengan username/password (meski single-user, tetap perlu untuk jejak siapa yang input data).
3. **Manajemen Anggota**: CRUD data anggota (tambah, edit, nonaktifkan, cari/filter).
4. **Input Iuran Bulanan**:
   - Halaman untuk memilih periode (bulan/tahun), lalu menampilkan checklist semua anggota aktif dengan status bayar/belum.
   - Bisa centang banyak anggota sekaligus lalu submit sebagai pembayaran massal (bulk insert), otomatis membuat entri di `kas_transaksi` dengan tipe masuk.
   - Rekap otomatis: siapa saja yang belum bayar bulan berjalan.
5. **Transaksi Kas Keluar**: form input pengeluaran dengan kategori, nominal, tanggal, keterangan.
6. **Dashboard**: kartu ringkasan (saldo saat ini, total masuk bulan ini, total keluar bulan ini, jumlah anggota belum bayar), grafik tren kas 6-12 bulan terakhir.
7. **Laporan**: filter transaksi per rentang tanggal/periode, export ke PDF dan/atau Excel.
8. **Pengaturan**: ubah nominal wajib iuran per periode, kelola kategori transaksi, manajemen user.

### Kebutuhan UI/UX
- Desain harus terlihat modern, bersih, mirip dashboard admin/finance (card statistik di atas, tabel/grafik di bawah).
- Gunakan layout sidebar untuk navigasi (Dashboard, Anggota, Iuran, Transaksi Kas, Laporan, Pengaturan).
- Gunakan warna yang konsisten dan hindari tampilan default browser polos — styling harus rapi dan profesional.
- Semua teks dan label dalam Bahasa Indonesia.
- Format angka menggunakan format Rupiah (Rp10.000, bukan 10000).
- Tambahkan validasi form yang jelas dan pesan error yang mudah dipahami pengguna non-teknis.

### Instruksi Kerja
1. Mulai dengan setup project kosong (`create-tauri-app` dengan template React + TypeScript), lalu install Tailwind dan shadcn/ui.
2. Buat struktur folder yang jelas: pisahkan `src/pages`, `src/components`, `src/lib`, dan di sisi Rust pisahkan `src-tauri/src/commands`, `src-tauri/src/db`, `src-tauri/src/models`.
3. Bangun koneksi database dan migration lebih dulu sebelum UI, supaya command Tauri bisa langsung dites.
4. Setelah backend dasar (CRUD anggota) jalan, baru lanjut ke frontend halaman per halaman sesuai urutan fitur di atas.
5. Jelaskan setiap command Rust baru yang dibuat (nama function, parameter, return type) supaya saya paham cara pakainya dari sisi React.
6. Kalau ada keputusan desain/arsitektur yang ambigu, tanyakan dulu ke saya sebelum lanjut, jangan asumsi sendiri untuk hal yang berdampak besar ke struktur data.

Tolong mulai dengan menyiapkan struktur project awal dan skema database dulu, baru kita lanjut ke fitur satu per satu.

---

---

## PROMPT TAMBAHAN — Fitur Cek Status Iuran Publik (Google Sheets + Apps Script + GitHub Pages)

Gunakan prompt ini terpisah setelah aplikasi utama (Tauri) sudah berjalan, untuk membangun fitur tambahan: halaman publik yang bisa dilihat anggota forum untuk cek status iuran mereka (lunas/belum), tanpa perlu install aplikasi.

### Konteks
Aplikasi kas utama (Tauri + Rust + SQLite) tetap berjalan offline di komputer bendahara. Fitur ini adalah "jembatan" tambahan agar anggota forum bisa cek status iuran mereka sendiri lewat browser, dengan biaya Rp0 (tanpa server/domain berbayar).

### Arsitektur yang diinginkan

```
Aplikasi Tauri (kas offline, sumber data utama)
      ↓ export/sync data secara berkala (manual atau otomatis)
Google Sheets (media penyimpanan data "jembatan", gratis)
      ↓ dibaca oleh
Google Apps Script (di-deploy sebagai Web App → menghasilkan endpoint JSON)
      ↓ di-fetch oleh
Halaman HTML/JS statis, di-hosting gratis di GitHub Pages (tampilan yang dilihat anggota)
```

### Bagian 1 — Sinkronisasi data dari Tauri ke Google Sheets

Tolong bantu saya buatkan:
1. Fitur **export CSV** dari aplikasi Tauri (data: nama anggota, periode, status lunas/belum — TANPA data sensitif seperti no HP atau nominal detail), yang bisa saya upload manual ke Google Sheets. Ini opsi paling sederhana untuk tahap awal.
2. (Opsional, tahap lanjut) Command Rust yang push data otomatis ke Google Sheets lewat Google Sheets API menggunakan Service Account, dipicu setiap kali ada perubahan data pembayaran iuran.

Struktur kolom di Google Sheets:
```
nama_anggota | unit_kerja | bulan | tahun | status ('Lunas' / 'Belum Bayar')
```
Catatan: JANGAN sertakan kolom nominal, no HP, atau data sensitif lain — sheet ini akan diakses publik.

### Bagian 2 — Google Apps Script sebagai API

Tolong buatkan kode Google Apps Script yang:
1. Dideploy sebagai **Web App** (akses: "Anyone with the link", method GET).
2. Membaca data dari Google Sheets di atas.
3. Mengembalikan response dalam format **JSON**, dengan dukungan query parameter untuk filter (misal `?nama=Budi` atau `?bulan=9&tahun=2026`).
4. Set header response yang benar (`ContentService.createTextOutput` dengan `MimeType.JSON`) supaya bisa langsung di-fetch dari JavaScript di domain lain (GitHub Pages).

Contoh response JSON yang diharapkan:
```json
[
  { "nama": "Budi Santoso", "unit_kerja": "SDN 1 Contoh", "bulan": 9, "tahun": 2026, "status": "Lunas" },
  { "nama": "Siti Aminah", "unit_kerja": "SDN 2 Contoh", "bulan": 9, "tahun": 2026, "status": "Belum Bayar" }
]
```

### Bagian 3 — Halaman statis di GitHub Pages

Tolong buatkan halaman HTML + CSS + JavaScript (vanilla, tanpa framework berat, supaya ringan di-hosting statis) dengan fitur:
1. **Kolom pencarian** nama anggota (real-time filter, tanpa reload halaman).
2. **Fetch data** dari endpoint Google Apps Script di atas (pakai `fetch()`).
3. Tampilkan hasil dalam bentuk **kartu atau tabel rapi**, dengan badge warna:
   - Hijau untuk status "Lunas"
   - Merah/oranye untuk status "Belum Bayar"
4. Tampilkan filter periode (dropdown bulan/tahun) di atas tabel.
5. Desain responsif (rapi juga dibuka dari HP, karena kemungkinan besar anggota buka dari WA/browser HP).
6. Loading state yang jelas saat data sedang di-fetch (karena Apps Script kadang agak lambat merespons pertama kali).
7. Struktur file yang siap langsung di-push ke GitHub Pages (`index.html`, `style.css`, `script.js` — tanpa build step, supaya bisa langsung online tanpa proses compile).

### Prioritas Pengerjaan
1. Mulai dari Bagian 1 opsi manual (export CSV) — paling cepat menghasilkan sesuatu yang bisa dites.
2. Lanjut Bagian 2 (Apps Script API) setelah data di Sheets sudah konsisten formatnya.
3. Terakhir Bagian 3 (halaman GitHub Pages) setelah endpoint API sudah bisa diakses dan diuji lewat browser/Postman.

Tolong jelaskan juga langkah deploy Apps Script (cara ambil URL Web App) dan langkah push ke GitHub Pages (cara aktifkan di repo settings), karena saya belum pernah melakukan ini sebelumnya.

---

## Catatan Pemakaian

- Kalau AI assistant kamu punya batas panjang konteks, kamu bisa memecah prompt ini jadi beberapa tahap: kirim bagian "Tech Stack + Skema Database" dulu untuk setup awal, baru kirim bagian "Fitur" satu per satu sesuai urutan prioritas.
- Simpan skema database di atas sebagai referensi terpisah, supaya konsisten dipakai baik saat kamu chat dengan saya maupun dengan asisten AI di code editor kamu.
