import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";
import path from "path";

const doc = new jsPDF({
  orientation: "portrait",
  unit: "mm",
  format: "a4",
});

const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const margin = 18;
const contentWidth = pageWidth - margin * 2;

// Colors
const PRIMARY = [102, 126, 234]; // #667eea
const SECONDARY = [118, 75, 162]; // #764ba2
const DARK = [30, 41, 59]; // #1e293b
const GRAY = [100, 116, 139]; // #64748b
const LIGHT_BG = [248, 250, 252]; // #f8fafc
const EMERALD = [22, 163, 74]; // #16a34a
const AMBER = [217, 119, 6]; // #d97706
const RED = [220, 38, 38]; // #dc2626

// Helper: Header & Footer for content pages
function addHeaderFooter(doc, pageNum, totalPages) {
  if (pageNum === 1) return; // Skip cover page

  // Top header line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, 12, pageWidth - margin, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Buku Panduan Penggunaan — Aplikasi Kas Forum PPPK", margin, 9);
  doc.text("v1.0.0 • IrfanDev97", pageWidth - margin, 9, { align: "right" });

  // Bottom footer line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Dokumen Resmi Panduan Operasional Sistem Kas",
    margin,
    pageHeight - 8,
  );
  doc.text(
    `Halaman ${pageNum} dari ${totalPages}`,
    pageWidth - margin,
    pageHeight - 8,
    { align: "right" },
  );
}

// Helper: Section Title
function addSectionHeader(doc, y, title, subtitle) {
  doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.roundedRect(margin, y, 3.5, 9, 1, 1, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  doc.text(title, margin + 6, y + 6.5);

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    doc.text(subtitle, margin + 6, y + 12);
    return y + 17;
  }
  return y + 12;
}

// Helper: Callout Box
function addCallout(doc, y, title, text, type = "info") {
  const color =
    type === "warning" ? AMBER : type === "success" ? EMERALD : PRIMARY;
  const bgColor =
    type === "warning"
      ? [254, 243, 199]
      : type === "success"
        ? [236, 253, 245]
        : [238, 242, 255];

  doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(0.4);

  const lines = doc.splitTextToSize(text, contentWidth - 12);
  const boxHeight = 10 + lines.length * 4.5;

  doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(title, margin + 4, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  doc.text(lines, margin + 4, y + 11);

  return y + boxHeight + 4;
}

// ==========================================
// 1. COVER PAGE
// ==========================================
// Background Gradient Banner
doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
doc.rect(0, 0, pageWidth, 90, "F");
doc.setFillColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
doc.triangle(pageWidth, 0, pageWidth, 90, 0, 90, "F");

// App Logo
try {
  const logoPath = path.resolve("public/app-logo.png");
  if (fs.existsSync(logoPath)) {
    const logoBase64 = fs.readFileSync(logoPath).toString("base64");
    doc.addImage(logoBase64, "PNG", pageWidth / 2 - 22, 20, 44, 44);
  }
} catch (e) {
  console.log("Logo load note:", e.message);
}

// App Name on Banner
doc.setFont("helvetica", "bold");
doc.setFontSize(22);
doc.setTextColor(255, 255, 255);
doc.text("FORUM PPPK", pageWidth / 2, 75, { align: "center" });

doc.setFont("helvetica", "normal");
doc.setFontSize(11);
doc.setTextColor(238, 242, 255);
doc.text("APLIKASI PENGELOLAAN KAS & IURAN ANGGOTA", pageWidth / 2, 82, {
  align: "center",
});

// Document Title
let curY = 108;
doc.setFont("helvetica", "bold");
doc.setFontSize(20);
doc.setTextColor(DARK[0], DARK[1], DARK[2]);
doc.text("BUKU PANDUAN PENGGUNA", pageWidth / 2, curY, { align: "center" });

curY += 7;
doc.setFont("helvetica", "normal");
doc.setFontSize(11);
doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
doc.text("Petunjuk Operasional & Pengoperasian Lengkap", pageWidth / 2, curY, {
  align: "center",
});

curY += 16;
// Decorative Divider
doc.setDrawColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
doc.setLineWidth(1);
doc.line(pageWidth / 2 - 25, curY, pageWidth / 2 + 25, curY);

curY += 15;
// Metadata Card
doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
doc.setDrawColor(226, 232, 240);
doc.roundedRect(margin + 12, curY, contentWidth - 24, 75, 3, 3, "FD");

const metaStartY = curY + 12;
const metaLeft = margin + 20;

doc.setFont("helvetica", "bold");
doc.setFontSize(10);
doc.setTextColor(DARK[0], DARK[1], DARK[2]);
doc.text("Informasi Rilis Dokumen:", metaLeft, metaStartY);

const metaItems = [
  ["Nama Perangkat Lunak", "Aplikasi Kas Forum PPPK Desktop"],
  ["Versi Aplikasi", "v1.0.0 (Stabil)"],
  ["Teknologi Dasar", "Aplikasi Desktop Offline • SQLite"],
  ["Pengembang Utama", "IrfanDev97"],
  ["Target Platform", "Windows 10 / 11 (64-bit Standalone)"],
  ["Konektivitas", "100% Offline & Lokal (Tanpa Internet)"],
  ["Tanggal Dokumentasi", "September 2026"],
];

doc.setFontSize(9);
metaItems.forEach(([k, v], idx) => {
  const rowY = metaStartY + 8 + idx * 7.5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
  doc.text(k, metaLeft, rowY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  doc.text(`:  ${v}`, metaLeft + 45, rowY);
});

// Bottom Cover Note
doc.setFont("helvetica", "normal");
doc.setFontSize(8.5);
doc.setTextColor(148, 163, 184);
doc.text(
  "Dokumen panduan ini ditujukan bagi pengurus forum, bendahara, dan auditor internal.",
  pageWidth / 2,
  pageHeight - 16,
  { align: "center" },
);

// ==========================================
// 2. DAFTAR ISI & PENDAHULUAN
// ==========================================
doc.addPage();
curY = 22;

curY = addSectionHeader(
  doc,
  curY,
  "1. DAFTAR ISI PANDUAN",
  "Struktur modul pembahasan dalam buku panduan ini",
);

const tocItems = [
  ["1.0", "Daftar Isi & Pendahuluan Aplikasi", "Halaman 2"],
  ["2.0", "Akses Masuk (Login) & Manajemen Akun", "Halaman 3"],
  ["3.0", "Halaman Beranda (Dashboard & Analitik Kas)", "Halaman 3"],
  ["4.0", "Pengelolaan Data Anggota (Tambah, Edit, Impor Excel)", "Halaman 4"],
  ["5.0", "Pencatatan Kas Masuk (Iuran Anggota Multi-Bulan)", "Halaman 5"],
  ["6.0", "Daftar Lunas Tahunan (Checklist 12 Bulan & Cetak)", "Halaman 6"],
  ["7.0", "Pencatatan Kas Keluar (Pengeluaran & Kwitansi)", "Halaman 7"],
  ["8.0", "Laporan Keuangan (Filter, PDF, Excel, CSV)", "Halaman 8"],
  ["9.0", "Riwayat Kegiatan (Audit Log) & Keamanan Data", "Halaman 9"],
  ["10.0", "Pengaturan, Manajemen Pengguna & Backup/Restore", "Halaman 10"],
  ["11.0", "Pertanyaan Umum (FAQ) & Tips Penting Bendahara", "Halaman 11"],
];

autoTable(doc, {
  startY: curY,
  margin: { left: margin, right: margin },
  head: [["No", "Bagian / Modul Panduan", "Letak Halaman"]],
  body: tocItems,
  theme: "striped",
  headStyles: {
    fillColor: PRIMARY,
    textColor: 255,
    fontStyle: "bold",
    fontSize: 9,
  },
  bodyStyles: { fontSize: 8.5, textColor: DARK },
  columnStyles: {
    0: { cellWidth: 16, fontStyle: "bold" },
    1: { cellWidth: "auto" },
    2: { cellWidth: 32, halign: "right" },
  },
});

curY = doc.lastAutoTable.finalY + 10;

curY = addSectionHeader(
  doc,
  curY,
  "2. PENDAHULUAN & ARSITEKTUR APLIKASI",
  "Gambaran umum tujuan pembuatan dan keamanan aplikasi",
);

doc.setFont("helvetica", "normal");
doc.setFontSize(9);
doc.setTextColor(DARK[0], DARK[1], DARK[2]);
const introText = [
  "Aplikasi Kas Forum PPPK dirancang khusus untuk memenuhi kebutuhan pengurus Forum PPPK dalam mengelola administrasi iuran bulanan dan kas organisasi secara transparan, akuntabel, dan rapi.",
  "",
  "Prinsip Keamanan & Privasi Utama:",
  "• Penyimpanan 100% Lokal: Database menggunakan engine SQLite embedded yang tersimpan langsung di direktori komputer pengguna (%APPDATA%\\com.forumpppk.kas\\kas.db).",
  "• Zero Cloud / No Internet: Tidak ada data sensitif anggota yang dikirimkan ke server eksternal, menjamin keamanan data anggota.",
  "• Single Source of Truth: Saldo kas tidak disimpan secara manual, melainkan dihitung secara real-time dari seluruh akumulasi transaksi masuk dan transaksi keluar sehingga bebas manipulasi angka saldo.",
];
doc.text(introText, margin, curY);

curY += 46;
curY = addCallout(
  doc,
  curY,
  "PENTING — KREDENSIAL LOGIN BAWAAN AWAL",
  "Username Bawaan: admin  |  Password Bawaan: admin123\nSegera ganti password Anda melalui menu Pengaturan setelah berhasil masuk pertama kali!",
  "warning",
);

// ==========================================
// 3. LOGIN & BERANDA (DASHBOARD)
// ==========================================
doc.addPage();
curY = 22;

curY = addSectionHeader(
  doc,
  curY,
  "3. AKSES MASUK (LOGIN) & KEAMANAN",
  "Prosedur masuk ke aplikasi dan peran pengguna",
);

doc.setFont("helvetica", "normal");
doc.setFontSize(9);
doc.setTextColor(DARK[0], DARK[1], DARK[2]);
doc.text(
  [
    "1. Jalankan aplikasi melalui shortcut desktop atau menu Start Windows.",
    "2. Masukkan Nama Pengguna (username) dan Kata Sandi (password) terdaftar.",
    "3. Klik tombol 'Masuk ke Aplikasi' atau tekan tombol Enter pada keyboard.",
    "",
    "Hak Akses Peran Pengguna (Role-based Access Control):",
    "• Admin: Memiliki hak penuh untuk mengelola pengguna, menghapus data, mengatur kategori, dan konfigurasi sistem.",
    "• Bendahara: Berhak mencatat iuran masuk, transaksi kas keluar, mengunduh laporan, dan melihat checklist.",
    "• Viewer (Hanya Lihat): Hanya dapat memantau saldo, melihat laporan, dan memeriksa daftar lunas tanpa izin mengubah data.",
  ],
  margin,
  curY,
);

curY += 46;
curY = addSectionHeader(
  doc,
  curY,
  "4. HALAMAN BERANDA (DASHBOARD)",
  "Pusat informasi ringkasan kas dan monitoring tunggakan",
);

doc.text(
  [
    "Halaman Beranda menyajikan gambaran cepat kondisi keuangan forum:",
    "• 4 Kartu Metrik Utama:",
    "   1. Sisa Uang Kas: Total saldo riil yang ada saat ini (Total Masuk - Total Keluar).",
    "   2. Uang Masuk Bulan Ini: Akumulasi penerimaan iuran dan kas masuk periode bulan berjalan.",
    "   3. Uang Keluar Bulan Ini: Akumulasi belanja/pengeluaran forum periode bulan berjalan.",
    "   4. Belum Bayar Bulan Ini: Jumlah anggota aktif yang belum melunasi iuran bulan ini.",
    "• Grafik Tren Keuangan (12 Bulan): Garis hijau (pemasukan) dan merah (pengeluaran) untuk memantau tren pergerakan kas.",
    "• Grafik Sisa Kas (6 Bulan): Batang visual surplus/defisit bersih bulanan.",
    "• Daftar Tunggakan: Daftar nama anggota yang belum melunasi iuran bulan berjalan.",
    "• 5 Transaksi Terakhir: Riwayat mutasi kas paling mutakhir bulan berjalan.",
  ],
  margin,
  curY,
);

curY += 56;
curY = addCallout(
  doc,
  curY,
  "TIPS OPERASIONAL",
  "Gunakan tombol 'Muat Ulang' di pojok kanan atas Beranda untuk menyegarkan grafik dan metrik saldo secara instan.",
  "info",
);

// ==========================================
// 4. PENGELOLAAN ANGGOTA
// ==========================================
doc.addPage();
curY = 22;

curY = addSectionHeader(
  doc,
  curY,
  "5. MANAJEMEN DATA ANGGOTA",
  "Pencatatan, pencarian, dan impor massal dari Excel",
);

doc.setFont("helvetica", "normal");
doc.setFontSize(9);
doc.setTextColor(DARK[0], DARK[1], DARK[2]);
doc.text(
  [
    "Halaman Anggota digunakan untuk mengelola seluruh data anggota forum PPPK. Data anggota ini menjadi dasar pembuatan daftar iuran bulanan dan checklist lunas.",
    "",
    "A. Menambah Anggota Baru:",
    "1. Buka menu 'Anggota' pada sidebar navigasi.",
    "2. Klik tombol '+ Tambah Anggota' di pojok kanan atas.",
    "3. Isi formulir modal: Nama Lengkap*, Unit Kerja/Sekolah*, NIP/NUPTK (opsional), No. HP (opsional).",
    "4. Pastikan opsi 'Anggota aktif' tercentang, lalu klik 'Simpan'.",
    "",
    "B. Mengubah (Edit) & Menonaktifkan Anggota:",
    "• Edit: Klik tombol 'Edit' di baris nama anggota untuk memperbarui informasi unit kerja atau kontak.",
    "• Nonaktifkan: Klik 'Nonaktifkan' jika anggota mutasi atau keluar. Sistem menerapkan Soft-Delete sehingga riwayat pembayaran kas di masa lampau tetap utuh dan tidak terhapus!",
    "",
    "C. Impor Massal Data Anggota dari File Excel (.xlsx / .csv):",
    "Jika anggota forum berjumlah puluhan atau ratusan, gunakan fitur Impor Excel:",
    "1. Klik tombol 'Unduh Template' pada halaman Anggota untuk mendapatkan format baku.",
    "2. Buka file template-anggota.xlsx dan isi 4 kolom wajib: Nama, NIP/NUPTK, Unit Kerja, No HP.",
    "3. Kembali ke aplikasi, klik 'Impor Excel' dan pilih file yang telah diisi.",
    "4. Periksa pratinjau data pada tabel, lalu klik tombol 'Impor Baris'.",
    "5. Sistem akan memproses dan menampilkan ringkasan jumlah baris berhasil dan gagal.",
  ],
  margin,
  curY,
);

curY += 86;
autoTable(doc, {
  startY: curY,
  margin: { left: margin, right: margin },
  head: [["Kolom Excel", "Keterangan", "Sifat Kolom", "Contoh Data"]],
  body: [
    [
      "Nama",
      "Nama lengkap anggota beserta gelar",
      "Wajib Diisi",
      "Budi Santoso, S.Pd.",
    ],
    [
      "NIP/NUPTK",
      "Nomor Induk Pegawai / NUPTK resmi",
      "Wajib Diisi",
      "198501012022211001",
    ],
    [
      "Unit Kerja",
      "Sekolah atau instansi tempat bertugas",
      "Wajib Diisi",
      "SDN 1 Rejoso",
    ],
    [
      "No HP",
      "Nomor WhatsApp aktif untuk konfirmasi",
      "Wajib Diisi",
      "081234567890",
    ],
  ],
  theme: "grid",
  headStyles: { fillColor: PRIMARY, fontSize: 8.5 },
  bodyStyles: { fontSize: 8 },
});

// ==========================================
// 5. PENCATATAN KAS MASUK (IURAN)
// ==========================================
doc.addPage();
curY = 22;

curY = addSectionHeader(
  doc,
  curY,
  "6. PENCATATAN KAS MASUK (IURAN ANGGOTA)",
  "Prosedur pembayaran iuran bulanan fleksibel 1 hingga 12 bulan",
);

doc.setFont("helvetica", "normal");
doc.setFontSize(9);
doc.setTextColor(DARK[0], DARK[1], DARK[2]);
doc.text(
  [
    "Modul Kas Masuk dirancang sangat fleksibel dan cepat untuk mencatat pembayaran anggota:",
    "",
    "Langkah-Langkah Input Pembayaran Iuran:",
    "1. Buka menu 'Kas' pada sidebar, pastikan berada di tab 'Kas Masuk — Iuran Anggota'.",
    "2. Cari Nama Anggota: Ketik nama atau NIP anggota pada kotak pencarian. Pilih dari daftar dropdown.",
    "3. Pilih Tahun Pembayaran: Masukkan tahun (default tahun berjalan, misal 2026).",
    "4. Pilih Bulan yang Dibayar: Centang kotak bulan (Januari s/d Desember) yang akan dilunasi.",
    "   • Bulan yang sudah pernah lunas otomatis diberi tanda ✓ hijau dan dinonaktifkan (mencegah bayar ganda).",
    "   • Anda dapat mencentang 1 bulan, 3 bulan, 6 bulan, atau sekaligus 12 bulan lunas setahun.",
    "   • Total nominal terhitung otomatis (misal: 6 bulan x Rp 10.000 = Rp 60.000).",
    "5. Pilih Metode Pembayaran:",
    "   • Tunai (Cash): Bayar langsung ke bendahara.",
    "   • Transfer: Wajib mengunggah foto struk/bukti transfer bank (format JPG/PNG/PDF).",
    "6. Klik tombol 'Simpan'. Transaksi otomatis tercatat, saldo bertambah, dan checklist tercentang.",
  ],
  margin,
  curY,
);

curY += 60;
curY = addCallout(
  doc,
  curY,
  "FITUR KHUSUS — BAYAR RAME-RAME (SAAT RAPAT FORUM)",
  "Saat pertemuan rutin atau rapat forum, banyak anggota membayar bersamaan dalam 1 bulan yang sama.\nAktifkan fitur 'Bayar Rame-rame' di menu Pengaturan. Pada formulir rapat, bendahara cukup mencentang banyak anggota sekaligus dan mencatatnya dalam sekali klik!",
  "success",
);

curY = addCallout(
  doc,
  curY,
  "ATURAN INTEGRITAS DATA KAS",
  "Pemasukan dari iuran anggota terikat langsung dengan status pelunasan anggota. Oleh karena itu, transaksi iuran tidak dapat dihapus sembarangan di menu pengeluaran biasa untuk menjaga akurasi laporan kas!",
  "warning",
);

// ==========================================
// 6. CHECKLIST DAFTAR LUNAS & CETAK
// ==========================================
doc.addPage();
curY = 22;

curY = addSectionHeader(
  doc,
  curY,
  "7. DAFTAR LUNAS TAHUNAN (CHECKLIST) & CETAK",
  "Matriks pemantauan status pelunasan 12 bulan dan cetak fisik",
);

doc.setFont("helvetica", "normal");
doc.setFontSize(9);
doc.setTextColor(DARK[0], DARK[1], DARK[2]);
doc.text(
  [
    "Halaman 'Daftar Lunas' menyajikan matriks kisi-kisi tahunan yang memperlihatkan status pembayaran setiap anggota dari bulan Januari hingga Desember dalam satu layar penuh.",
    "",
    "A. Cara Membaca Matriks:",
    "• Tanda '✓' Hijau: Menandakan iuran bulan tersebut sudah lunas.",
    "• Tanda '—' Abu-abu: Menandakan iuran bulan tersebut belum dibayar.",
    "• Sub-angka Header Bulan: Angka 'X/Total' di bawah nama bulan menunjukkan jumlah anggota yang sudah lunas berbanding total anggota (berubah hijau saat seluruh anggota lunas).",
    "• Warna Baris:",
    "   - Hijau Muda: Anggota telah lunas penuh 12 bulan (12/12).",
    "   - Merah Muda: Anggota belum membayar sama sekali (0/12).",
    "",
    "B. Prosedur Mencetak Daftar Lunas (Print Cetak Fisik):",
    "1. Masukkan tahun yang ingin dicetak pada kolom tahun, klik 'Tampilkan'.",
    "2. Klik tombol 'Cetak' di pojok kanan atas.",
    "3. Jendela pratinjau cetak browser/OS akan terbuka secara otomatis dengan tata letak optimal:",
    "   • Format Otomatis: A4 Landscape (Melebar).",
    "   • Header Resmi: Menampilkan judul forum, tanggal cetak, dan total statistik lunas.",
    "   • Kolom Tanda Tangan: Disediakan kolom tanda tangan basah Bendahara di kanan bawah.",
    "4. Pilih printer fisik yang terhubung atau pilih 'Save as PDF' untuk menyimpan dokumen.",
    "",
    "C. Ekspor ke Excel:",
    "Klik tombol 'Unduh Excel' untuk menghasilkan file daftar-iuran-{tahun}.xlsx lengkap dengan rumus.",
  ],
  margin,
  curY,
);

curY += 86;
curY = addCallout(
  doc,
  curY,
  "FASILITAS LAPORAN RAPAT BULANAN",
  "Daftar Lunas cetak sangat cocok ditempel di papan pengumuman atau dibagikan saat rapat bulanan forum sebagai bentuk transparansi keuangan kas.",
  "info",
);

// ==========================================
// 7. KAS KELUAR & PENGELUARAN
// ==========================================
doc.addPage();
curY = 22;

curY = addSectionHeader(
  doc,
  curY,
  "8. PENCATATAN PENGELUARAN KAS (KAS KELUAR)",
  "Pengendalian belanja organisasi dan proteksi saldo minus",
);

doc.setFont("helvetica", "normal");
doc.setFontSize(9);
doc.setTextColor(DARK[0], DARK[1], DARK[2]);
doc.text(
  [
    "Setiap rupiah yang dikeluarkan/dimasukkan dari kas forum wajib dicatat secara transparan:",
    "",
    "Langkah Mencatat Pengeluaran Baru:",
    "1. Buka menu 'Kas' lalu klik tab 'Pengeluaran & Pemasukan' (atau transaksi).",
    "2. Klik tombol '+ Tambah Pengeluaran' atau '+ Tambah Pemasukan' di bagian atas.",
    "3. Pilih Jenis Transaksi: Masuk (sumbangan/bonus selain iuran) atau Keluar, lalu isi:",
    "   • Jenis Keperluan/Kategori: Pilih dari kategori (buat baru di Pengaturan → Jenis Keperluan tipe Masuk/Keluar jika belum ada).",
    "   • Tanggal: Pilih tanggal transaksi.",
    "   • Nominal: Masukkan jumlah.",
    "   • Keterangan Rinci: Jelaskan keperluan (mis. Sumbangan alumni, Pembelian snack rapat).",
    "   • Penanggung Jawab: Nama pengurus (opsional).",
    "   • Upload Bukti: Wajib untuk Keluar, opsional untuk Masuk.",
    "4. Klik 'Simpan'. Saldo kas riil akan langsung bertambah/berkurang. Iuran tetap via tab Kas Masuk — Iuran, saldo awal via Pengaturan → Saldo Awal.",
  ],
  margin,
  curY,
);

curY += 60;
curY = addCallout(
  doc,
  curY,
  "FITUR PROTEKSI SALDO MINUS (DEFISIT GUARD)",
  "Sistem secara cerdas menolak pencatatan pengeluaran apabila nominal belanja melebihi sisa uang kas yang tersedia. Hal ini mencegah terjadinya pembukuan fiktif atau saldo negatif!",
  "warning",
);

curY = addSectionHeader(
  doc,
  curY,
  "9. LAPORAN KEUANGAN LENGKAP",
  "Rekapitulasi berkala dan ekspor multi-format",
);

doc.text(
  [
    "Menu 'Laporan' menyediakan fleksibilitas penyusunan buku kas umum:",
    "• Filter Kustom: Pilih rentang tanggal 'Dari' dan 'Sampai' serta filter jenis (Semua / Masuk / Keluar).",
    "• Ringkasan Finansial: Total Pemasukan, Total Pengeluaran, dan Saldo Bersih Periode.",
    "• Format Ekspor Lengkap:",
    "   1. Unduh Excel (.xlsx): Lengkap dengan baris total untuk diolah lebih lanjut.",
    "   2. Unduh PDF (.pdf): Format siap cetak resmi dengan tabel terstruktur.",
    "   3. Unduh CSV (.csv): Untuk impor ke Google Sheets atau software akuntansi.",
  ],
  margin,
  curY,
);

// ==========================================
// 8. AUDIT LOG & PENGATURAN / BACKUP
// ==========================================
doc.addPage();
curY = 22;

curY = addSectionHeader(
  doc,
  curY,
  "10. RIWAYAT KEGIATAN (AUDIT TRAIL)",
  "Pencatatan rekam jejak aktivitas demi akuntabilitas",
);

doc.setFont("helvetica", "normal");
doc.setFontSize(9);
doc.setTextColor(DARK[0], DARK[1], DARK[2]);
doc.text(
  [
    "Setiap aksi yang dilakukan di dalam aplikasi tercatat secara otomatis pada tabel 'Riwayat Kegiatan':",
    "• Informasi yang Direkam: Waktu transaksi, nama pengguna (username), jenis aksi, dan rincian data.",
    "• Fitur Filter & Pencarian: Memudahkan bendahara melacak siapa yang menginput data tertentu.",
    "• Retensi Data 6 Bulan: Riwayat lama otomatis dibersihkan secara berkala agar database tetap ringan.",
  ],
  margin,
  curY,
);

curY += 28;
curY = addSectionHeader(
  doc,
  curY,
  "11. PENGATURAN, MANAJEMEN USER & CADANGAN DATA",
  "Pemeliharaan akun dan keselamatan database",
);

doc.text(
  [
    "A. Manajemen Akun Pengguna (Hanya Admin):",
    "• Admin dapat membuat akun baru untuk bendahara pembantu atau pengawas.",
    "• Pengguna default admin tidak boleh dihapus jika hanya tersisa satu akun.",
    "",
    "A2. Nominal Iuran Default (10.000 → 20.000):",
    "• Buka Pengaturan → Profil Forum → Nominal Iuran Default. Ubah 10000 jadi 20000 lalu Simpan.",
    "• Periode/bulan BARU otomatis 20.000. Periode lama yang sudah ada pembayaran tetap 10.000 (tidak retroaktif).",
    "• Untuk ubah bulan yang sudah ada: Iuran → pilih Bulan+Tahun → Simpan Jumlah Baru.",
    "",
    "A3. Saldo Awal — Sisa Buku Manual Tahun Lalu:",
    "• Pengaturan → Saldo Awal → isi Tanggal (mis. 2024-12-31), Nominal sisa, Keterangan 'Saldo awal 2024' → Simpan.",
    "• Tercatat sebagai kas masuk kategori Saldo Awal, langsung menambah saldo Dashboard & Laporan.",
    "• Bisa dihapus jika salah. Tidak mengganggu data iuran.",
    "",
    "B. Prosedur Pencadangan Data (Backup):",
    "1. Buka menu 'Pengaturan' lalu cari bagian 'Cadangan Data'.",
    "2. Klik 'Buat Cadangan Sekarang'.",
    "3. Sistem secara otomatis melakukan checkpoint SQLite WAL dan menyalin database ke folder cadangan:",
    "   Format File: kas-YYYY-MM-DD_HHMMSS.db",
    "4. Salin file cadangan tersebut ke media penyimpanan eksternal (Flashdisk / Google Drive pribadi).",
    "",
    "C. Prosedur Pemulihan Data (Restore):",
    "1. Klik tombol 'Pulihkan dari File'.",
    "2. Jendela dialog berkas native sistem operasi Windows akan terbuka.",
    "3. Pilih berkas file cadangan (.db) yang ingin dipulihkan.",
    "4. Masukkan konfirmasi kata sandi/keamanan, lalu sistem akan memulihkan data sepenuhnya.",
  ],
  margin,
  curY,
);

curY += 76;
curY = addCallout(
  doc,
  curY,
  "SOP PENCADANGAN RUTIN MINGGUAN",
  "Lakukan backup data minimal seminggu sekali atau setelah pertemuan bulanan. Jika komputer bermasalah, database dapat dipulihkan 100% tanpa ada data yang hilang.",
  "success",
);

// ==========================================
// 9. FAQ & TIPS PENGGUNAAN
// ==========================================
doc.addPage();
curY = 22;

curY = addSectionHeader(
  doc,
  curY,
  "12. TANYA JAWAB UMUM (FAQ)",
  "Solusi praktis kendala yang sering ditemui",
);

const faqs = [
  [
    "Di mana lokasi fisik database kas.db di Windows?",
    "Tersimpan di folder pengguna: %APPDATA%\\com.forumpppk.kas\\kas.db. Data ini aman dan tidak akan terhapus meskipun aplikasi diperbarui (update).",
  ],
  [
    "Apakah aplikasi ini membutuhkan kuota internet?",
    "Sama sekali tidak. Aplikasi 100% berbasis desktop lokal (offline-first).",
  ],
  [
    "Bagaimana jika saya lupa password akun admin?",
    "Jika masih ada akun admin cadangan, gunakan akun tersebut untuk reset password. Jika tidak, hubungi pengembang untuk bantuan pemulihan kredensial database.",
  ],
  [
    "Bolehkah menginstal aplikasi di beberapa komputer?",
    "Bisa. Anda dapat memindahkan database kas.db antar-komputer menggunakan fitur Buat Cadangan dan Pulihkan dari File.",
  ],
  [
    "Apakah bukti transfer atau nota tersimpan aman?",
    "Ya, seluruh bukti foto dikonversi secara aman dan terintegrasi di dalam catatan transaksi kas.",
  ],
  [
    "Apakah tampilan aplikasi dapat disesuaikan di layar laptop kecil?",
    "Ya. Aplikasi telah mendukung antarmuka responsif full-width dengan sidebar fleksibel yang nyaman di layar 1366x768 hingga 1920x1080.",
  ],
  [
    "Sisa saldo buku manual tahun lalu dimasukkan bagaimana?",
    'Buka Pengaturan → Saldo Awal → isi Tanggal 2024-12-31, Nominal sisa, Keterangan "Saldo awal 2024" → Simpan. Jadi kas masuk kategori Saldo Awal, langsung menambah saldo. Bisa dihapus jika salah.',
  ],
  [
    "Jika nominal iuran berubah 10.000 → 20.000 apa yang terjadi?",
    "Hanya periode/bulan baru yang 20.000. Periode lama yang sudah dibayar tetap 10.000 (tidak retroaktif). Atur Nominal Default di Pengaturan → Profil Forum.",
  ],
];

autoTable(doc, {
  startY: curY,
  margin: { left: margin, right: margin },
  head: [["Pertanyaan", "Jawaban Solutif"]],
  body: faqs,
  theme: "grid",
  headStyles: { fillColor: PRIMARY, fontSize: 8.5 },
  bodyStyles: { fontSize: 8, textColor: DARK },
  columnStyles: {
    0: { cellWidth: 55, fontStyle: "bold" },
    1: { cellWidth: "auto" },
  },
});

curY = doc.lastAutoTable.finalY + 12;

// Closing Card / Developer Signature
doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
doc.setDrawColor(226, 232, 240);
doc.roundedRect(margin, curY, contentWidth, 34, 2, 2, "FD");

doc.setFont("helvetica", "bold");
doc.setFontSize(9.5);
doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
doc.text("PENGEMBANG APLIKASI & DUKUNGAN TEKNIS", margin + 6, curY + 7);

doc.setFont("helvetica", "normal");
doc.setFontSize(8.5);
doc.setTextColor(DARK[0], DARK[1], DARK[2]);
doc.text(
  "Aplikasi ini dikembangkan dengan dedikasi penuh untuk kemajuan tata kelola keuangan Forum PPPK.",
  margin + 6,
  curY + 14,
);
doc.text(
  "Karya Pengembang: IrfanDev97 | Versi 1.0.0 | Rilis September 2026",
  margin + 6,
  curY + 20,
);
doc.text(
  "Untuk saran pengembangan fitur lanjutan, silakan sampaikan melalui pengurus forum terkait.",
  margin + 6,
  curY + 26,
);

// ==========================================
// ADD PAGE NUMBERS TO ALL PAGES
// ==========================================
const totalPages = doc.getNumberOfPages();
for (let i = 1; i <= totalPages; i++) {
  doc.setPage(i);
  addHeaderFooter(doc, i, totalPages);
}

// Output file
const outputFilename = "Panduan_Penggunaan_Aplikasi_Kas_Forum_PPPK.pdf";
const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

fs.writeFileSync(outputFilename, pdfBuffer);
console.log(`PDF saved successfully to root: ${outputFilename}`);

// Also copy to public folder for direct frontend download/view
const publicDest = path.resolve("public", outputFilename);
fs.writeFileSync(publicDest, pdfBuffer);
console.log(`PDF copied to public: ${publicDest}`);
