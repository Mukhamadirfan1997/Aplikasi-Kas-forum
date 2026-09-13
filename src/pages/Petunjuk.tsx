import { useState } from "react";
import { Button } from "@/components/ui/button";
import { saveAssetPdf } from "@/lib/fileSave";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LayoutDashboard,
  Users,
  Wallet,
  CheckSquare,
  BarChart2,
  History,
  Settings,
  BookOpen,
  ChevronDown,
  ChevronRight,
  LogIn,
  UserPlus,
  CreditCard,
  Download,
  Upload,
  Printer,
  Archive,
  RefreshCw,
  Shield,
  Tag,
  HelpCircle,
} from "lucide-react";

type Section = {
  id: string;
  icon: React.ReactNode;
  title: string;
  color: string;
  steps: { title: string; desc: string }[];
};

const SECTIONS: Section[] = [
  {
    id: "login",
    icon: <LogIn className="h-5 w-5" />,
    title: "Masuk ke Aplikasi",
    color: "bg-blue-50 border-blue-200",
    steps: [
      {
        title: "Buka aplikasi",
        desc: "Jalankan file aplikasi. Layar login akan muncul otomatis.",
      },
      {
        title: "Masukkan kredensial",
        desc: "Username default: admin — Kata sandi default: admin123. Segera ganti setelah pertama login.",
      },
      {
        title: "Klik Masuk",
        desc: "Jika berhasil, Anda langsung masuk ke halaman Beranda.",
      },
      {
        title: "Peran pengguna",
        desc: "Admin: akses penuh. Bendahara: kelola kas tapi tidak bisa hapus user. Viewer: hanya melihat, tidak bisa ubah data.",
      },
    ],
  },
  {
    id: "dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
    title: "Beranda (Dashboard)",
    color: "bg-indigo-50 border-indigo-200",
    steps: [
      {
        title: "Kartu ringkasan",
        desc: "Tampil 4 kartu: Sisa Kas, Uang Masuk Bulan Ini, Uang Keluar Bulan Ini, dan Jumlah Anggota Belum Bayar bulan ini.",
      },
      {
        title: "Grafik tren",
        desc: "Grafik garis 12 bulan terakhir (masuk hijau, keluar merah) dan grafik batang sisa kas 6 bulan terakhir.",
      },
      {
        title: "Tabel tunggakan",
        desc: "Daftar anggota yang belum bayar bulan berjalan. Jika sudah semua lunas, tampil tanda ✓ hijau.",
      },
      {
        title: "5 Transaksi terakhir",
        desc: "Riwayat transaksi kas bulan ini paling baru. Klik Muat Ulang untuk refresh data.",
      },
    ],
  },
  {
    id: "anggota",
    icon: <Users className="h-5 w-5" />,
    title: "Daftar Anggota",
    color: "bg-emerald-50 border-emerald-200",
    steps: [
      {
        title: "Lihat semua anggota",
        desc: "Tabel menampilkan nama, unit kerja, NIP, No HP, dan status. Filter Semua / Masih Aktif / Tidak Aktif.",
      },
      {
        title: "Cari anggota",
        desc: "Ketik di kolom pencarian — hasil muncul otomatis dalam 0,35 detik (debounce).",
      },
      {
        title: "Tambah anggota baru",
        desc: "Klik Tambah Anggota → isi Nama* dan Unit Kerja* (wajib) → Simpan.",
      },
      {
        title: "Edit data",
        desc: "Klik ikon pensil di baris anggota → ubah data → Simpan Perubahan.",
      },
      {
        title: "Nonaktifkan anggota",
        desc: "Klik tombol Nonaktifkan. Anggota tidak dihapus permanen — riwayat iurannya tetap tersimpan.",
      },
      {
        title: "Impor dari Excel",
        desc: "Klik Unduh Template → isi data di Excel → simpan → klik Impor Excel → pilih file → klik Impor. Kolom wajib: Nama, NIP/NUPTK, Unit Kerja, No HP.",
      },
    ],
  },
  {
    id: "kas",
    icon: <Wallet className="h-5 w-5" />,
    title: "Kas — Catat Iuran & Pengeluaran",
    color: "bg-yellow-50 border-yellow-200",
    steps: [
      {
        title: "Tab Kas Masuk (Iuran Anggota)",
        desc: "Cari nama anggota → pilih tahun → centang bulan yang akan dibayar (bulan sudah lunas otomatis dinonaktifkan) → pilih metode (Tunai/Transfer) → Catat Pembayaran.",
      },
      {
        title: "Bayar beberapa bulan sekaligus",
        desc: "Centang lebih dari satu bulan — nominal dihitung otomatis. Misal 3 bulan × Rp10.000 = Rp30.000.",
      },
      {
        title: "Tab Pengeluaran",
        desc: "Klik tab Pengeluaran → klik Tambah Transaksi → pilih Keluar → isi kategori, tanggal, nominal, keterangan → Simpan. Sistem cegah saldo minus.",
      },
      {
        title: "Tambah pemasukan selain iuran",
        desc: "Buka menu Kas → tab Pengeluaran & Pemasukan → klik Tambah Pemasukan → pilih jenis pemasukan (mis. Sumbangan, Bonus) → isi tanggal, nominal, keterangan → Simpan. Atau tambah kategori baru dulu di Pengaturan → Jenis Keperluan tipe Masuk.",
      },
      {
        title: "Hapus transaksi",
        desc: "Hanya transaksi pengeluaran & pemasukan umum yang bisa dihapus manual. Transaksi iuran hanya bisa dibatalkan dari halaman Checklist/Iuran.",
      },
    ],
  },
  {
    id: "checklist",
    icon: <CheckSquare className="h-5 w-5" />,
    title: "Daftar Lunas (Checklist Tahunan)",
    color: "bg-teal-50 border-teal-200",
    steps: [
      {
        title: "Pilih tahun",
        desc: "Isi tahun lalu klik Tampilkan. Tabel menampilkan seluruh anggota aktif × 12 bulan.",
      },
      {
        title: "Baca tanda",
        desc: "✓ hijau = sudah bayar bulan itu. — = belum bayar. Baris hijau muda = lunas semua 12 bulan. Baris merah muda = belum bayar sama sekali.",
      },
      {
        title: "Kolom sub-angka",
        desc: "Di bawah nama bulan ada angka X/Total — berapa anggota yang sudah bayar bulan tersebut (hijau = semua lunas).",
      },
      {
        title: "Cari anggota",
        desc: "Ketik nama/sekolah di kolom pencarian untuk menyaring tampilan.",
      },
      {
        title: "Cetak",
        desc: "Klik tombol Cetak → dialog print OS muncul → pilih printer atau Simpan sebagai PDF. Format A4 landscape, lengkap dengan ringkasan dan area tanda tangan.",
      },
      {
        title: "Unduh Excel",
        desc: "Klik Unduh Excel → file daftar-iuran-{tahun}.xlsx otomatis tersimpan. Berisi semua anggota, 12 bulan, dan kolom total.",
      },
    ],
  },
  {
    id: "laporan",
    icon: <BarChart2 className="h-5 w-5" />,
    title: "Laporan Keuangan",
    color: "bg-orange-50 border-orange-200",
    steps: [
      {
        title: "Pilih periode",
        desc: "Atur tanggal Dari dan Sampai, pilih jenis (Semua/Masuk/Keluar), lalu klik Tampilkan.",
      },
      {
        title: "Baca ringkasan",
        desc: "3 kotak menampilkan Total Masuk, Total Keluar, dan Sisa di periode tersebut.",
      },
      {
        title: "Unduh Excel",
        desc: "Klik Unduh Excel → file .xlsx berisi semua transaksi + baris total di bagian bawah.",
      },
      {
        title: "Unduh PDF",
        desc: "Klik Unduh PDF → file .pdf siap cetak dengan header, tabel, dan baris total otomatis.",
      },
      {
        title: "Unduh CSV",
        desc: "Untuk dibuka di Google Sheets atau dikirim ke bendahara lain. Klik Unduh CSV.",
      },
    ],
  },
  {
    id: "riwayat",
    icon: <History className="h-5 w-5" />,
    title: "Riwayat Kegiatan",
    color: "bg-purple-50 border-purple-200",
    steps: [
      {
        title: "Apa itu riwayat?",
        desc: "Setiap aksi penting (login, tambah anggota, bayar iuran, catat pengeluaran, buat cadangan) dicatat otomatis dengan waktu dan nama pengguna.",
      },
      {
        title: "Filter riwayat",
        desc: "Atur rentang tanggal, pilih jenis kegiatan dari dropdown, ketik pencarian nama/rincian, lalu klik Cari.",
      },
      {
        title: "Unduh Excel",
        desc: "Klik Unduh Excel untuk arsip riwayat lengkap.",
      },
      {
        title: "Hapus riwayat lama",
        desc: "Klik Hapus Lebih dari 6 Bulan untuk membersihkan data lama — otomatis dilakukan setiap buka aplikasi.",
      },
      {
        title: "Hapus semua",
        desc: "Klik Hapus Semua → ketik HAPUS untuk konfirmasi. Tidak bisa dikembalikan.",
      },
    ],
  },
  {
    id: "pengaturan",
    icon: <Settings className="h-5 w-5" />,
    title: "Pengaturan",
    color: "bg-slate-50 border-slate-200",
    steps: [
      {
        title: "Kelola Pengguna (Admin only)",
        desc: "Klik Tambah Pengguna → isi nama, username, kata sandi, pilih peran → Simpan. Hapus pengguna dengan ikon tempat sampah (minimal 1 pengguna harus ada).",
      },
      {
        title: "Nominal Iuran Default",
        desc: "Di Pengaturan → Profil Forum, isi Nominal Iuran Default (mis. 10000 atau 20000). Nilai ini otomatis dipakai untuk semua periode/bulan baru. Perubahan tidak mengubah nominal periode lama yang sudah ada pembayaran (tidak retroaktif). Untuk ubah nominal bulan yang sudah ada, buka Iuran → pilih Bulan+Tahun → Simpan Jumlah Baru.",
      },
      {
        title: "Jenis Keperluan (Kategori)",
        desc: "Tambah kategori baru untuk keperluan pengeluaran (mis. Transport, Sewa Gedung). Pilih tipe Masuk atau Keluar. Kategori 'Iuran Anggota' tidak bisa dihapus.",
      },
      {
        title: "Saldo Awal — Sisa Buku Manual Tahun Lalu",
        desc: "Jika ada sisa kas dari pembukuan manual tahun lalu, buka Pengaturan → Saldo Awal → isi Tanggal (mis. 2024-12-31), Nominal (mis. 1500000), Keterangan 'Saldo awal 2024' → Simpan. Otomatis jadi kas masuk kategori Saldo Awal dan menambah Saldo Dashboard. Tidak mengganggu data iuran, tidak retroaktif. Bisa dihapus jika salah.",
      },
      {
        title: "Cadangkan Data",
        desc: "Klik Buat Cadangan Sekarang → file kas-YYYY-MM-DD_HHMMSS.db tersimpan di folder backup dalam data aplikasi. Lakukan minimal 1× seminggu!",
      },
      {
        title: "Pulihkan Data",
        desc: "Klik Pulihkan dari File → pilih file .db cadangan via dialog file → konfirmasi 2× → aplikasi memuat ulang database. Semua data sekarang akan terganti dengan data cadangan.",
      },
      {
        title: "Pindah Laptop",
        desc: "Laptop lama: Buat Cadangan → copy file kas-*.db ke flashdisk. Laptop baru: instal aplikasi → login admin/admin123 → Pengaturan → Pulihkan dari File → pilih file backup → ketik PULIHKAN → restart aplikasi → login pakai akun dari backup.",
      },
    ],
  },
];

const FAQ = [
  {
    q: "Data disimpan di mana?",
    a: "File database SQLite tersimpan di %APPDATA%\\com.forumpppk.kas\\kas.db (Windows). Data tidak dikirim ke internet sama sekali — 100% lokal di komputer.",
  },
  {
    q: "Bagaimana jika saldo minus saat tambah pengeluaran?",
    a: "Sistem otomatis menolak transaksi pengeluaran yang melebihi saldo. Anda akan melihat pesan error dengan saldo tersedia saat ini.",
  },
  {
    q: "Bisa kah satu anggota bayar iuran untuk beberapa bulan sekaligus?",
    a: "Ya. Di halaman Kas → tab Kas Masuk, centang semua bulan yang ingin dibayar. Sistem akan membuat satu catatan per bulan, dengan total nominal dihitung otomatis.",
  },
  {
    q: "Apa perbedaan Kas Masuk dan Pengeluaran?",
    a: "Kas Masuk selalu berasal dari iuran anggota. Pengeluaran adalah semua uang yang keluar (konsumsi, ATK, kegiatan, dll) dan diinput manual di tab Pengeluaran.",
  },
  {
    q: "Transaksi iuran tidak bisa dihapus langsung?",
    a: "Benar. Transaksi iuran terhubung ke data pembayaran anggota. Untuk membatalkan, buka halaman Kas → cari anggota → klik Batalkan di bulan yang salah. Ini menjaga konsistensi data.",
  },
  {
    q: "Apakah update aplikasi menghapus data?",
    a: "Tidak. Database tersimpan di folder data pengguna terpisah dari folder instalasi. Namun tetap buat cadangan sebelum update sebagai langkah aman.",
  },
  {
    q: "Berapa banyak anggota yang bisa diimpor sekaligus?",
    a: "Maksimal 1.000 baris per satu kali impor Excel. Untuk lebih banyak, bagi menjadi beberapa file.",
  },
  {
    q: "Pindah laptop — bawa data lama bagaimana?",
    a: "Di laptop lama: Pengaturan → Cadangkan Data → Buat Cadangan Sekarang → copy file kas-YYYY-MM-DD_HHMMSS.db dari folder backup ke flashdisk. Di laptop baru: instal aplikasi → login default admin/admin123 → buka Pengaturan → Cadangkan Data → Pulihkan dari File → pilih file .db → konfirmasi PULIHKAN → tutup & buka ulang aplikasi. Semua anggota, iuran, kas, profil forum + NIP + logo, dan riwayat ikut pulih. Login selanjutnya pakai akun dari backup.",
  },
  {
    q: "Sisa saldo buku manual tahun lalu dimasukkan bagaimana?",
    a: "Buka Pengaturan → Saldo Awal → isi Tanggal 2024-12-31, Nominal sisa (mis. 1500000), Keterangan 'Saldo awal 2024' → Simpan. Akan jadi transaksi masuk kategori Saldo Awal, langsung menambah saldo. Laporan dan Dashboard otomatis terhitung. Jika salah, hapus di daftar Saldo Awal.",
  },
  {
    q: "Jika nominal iuran berubah 10.000 → 20.000 apa yang terjadi?",
    a: "Nominal baru hanya berlaku untuk periode/bulan baru. Periode lama yang sudah dibayar tetap 10.000 (tidak retroaktif). Atur Nominal Default di Pengaturan → Profil Forum agar periode baru otomatis 20.000, atau ubah manual per bulan di Iuran → Simpan Jumlah Baru.",
  },
];

export function Petunjuk() {
  const [openId, setOpenId] = useState<string | null>("login");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id));
  const toggleFaq = (i: number) =>
    setOpenFaq((prev) => (prev === i ? null : i));

  const handleDownloadPDF = async () => {
    await saveAssetPdf(
      "/Panduan_Penggunaan_Aplikasi_Kas_Forum_PPPK.pdf",
      "Panduan_Penggunaan_Aplikasi_Kas_Forum_PPPK.pdf"
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="h-6 w-6" /> Petunjuk Penggunaan
          </h2>
          <p className="text-sm text-white/80">
            Panduan langkah demi langkah untuk setiap fitur aplikasi. Klik
            bagian untuk membuka.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleDownloadPDF}
          className="bg-white text-[#667eea] hover:bg-white/90 shadow self-start sm:self-auto gap-2"
        >
          <Download className="h-4 w-4" /> Unduh Buku Panduan (PDF)
        </Button>
      </div>

      {/* Quick-tip banner */}
      <div
        className="rounded-xl px-4 py-3 text-sm flex items-start gap-3"
        style={{ background: "rgba(255,255,255,0.18)", color: "#fff" }}
      >
        <HelpCircle className="h-5 w-5 flex-shrink-0 mt-0.5 opacity-80" />
        <div>
          <span className="font-semibold">Pertama kali pakai?</span> Mulai dari{" "}
          <button
            className="underline font-medium"
            onClick={() => setOpenId("login")}
          >
            Masuk ke Aplikasi
          </button>{" "}
          →{" "}
          <button
            className="underline font-medium"
            onClick={() => setOpenId("anggota")}
          >
            Daftar Anggota
          </button>{" "}
          →{" "}
          <button
            className="underline font-medium"
            onClick={() => setOpenId("kas")}
          >
            Input Iuran
          </button>{" "}
          →{" "}
          <button
            className="underline font-medium"
            onClick={() => setOpenId("laporan")}
          >
            Cetak Laporan
          </button>
          .
        </div>
      </div>

      {/* Accordion fitur */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Panduan Per Fitur
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {SECTIONS.map((s) => (
            <div
              key={s.id}
              className={`border rounded-lg overflow-hidden ${s.color}`}
            >
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-left font-semibold text-sm hover:opacity-80 transition-opacity"
                onClick={() => toggle(s.id)}
              >
                <span className="flex items-center gap-2.5">
                  {s.icon}
                  {s.title}
                </span>
                {openId === s.id ? (
                  <ChevronDown className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 flex-shrink-0" />
                )}
              </button>
              {openId === s.id && (
                <div className="px-4 pb-4 space-y-3 bg-white/60">
                  {s.steps.map((step, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white border text-xs font-bold flex items-center justify-center shadow-sm">
                        {i + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-sm">
                          {step.title}
                        </div>
                        <div className="text-sm text-slate-600 mt-0.5 leading-relaxed">
                          {step.desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pintasan cepat */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Aksi Cepat — Ringkasan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {[
              {
                icon: <UserPlus className="h-4 w-4 text-emerald-600" />,
                text: "Tambah anggota baru → Anggota → Tambah Anggota",
              },
              {
                icon: <CreditCard className="h-4 w-4 text-blue-600" />,
                text: "Catat iuran → Kas → tab Kas Masuk → cari nama",
              },
              {
                icon: <Download className="h-4 w-4 text-orange-600" />,
                text: "Unduh template Excel → Anggota → Unduh Template",
              },
              {
                icon: <Upload className="h-4 w-4 text-purple-600" />,
                text: "Impor banyak anggota → Anggota → Impor Excel",
              },
              {
                icon: <Printer className="h-4 w-4 text-slate-600" />,
                text: "Cetak daftar lunas → Daftar Lunas → Cetak",
              },
              {
                icon: <BarChart2 className="h-4 w-4 text-red-600" />,
                text: "Laporan bulanan → Laporan → atur tanggal → Tampilkan",
              },
              {
                icon: <Archive className="h-4 w-4 text-amber-600" />,
                text: "Buat cadangan → Pengaturan → Cadangan Data → Buat Cadangan",
              },
              {
                icon: <RefreshCw className="h-4 w-4 text-teal-600" />,
                text: "Pulihkan data → Pengaturan → Pulihkan dari File → pilih .db",
              },
              {
                icon: <Shield className="h-4 w-4 text-indigo-600" />,
                text: "Tambah pengguna → Pengaturan → Tambah Pengguna (Admin)",
              },
              {
                icon: <Tag className="h-4 w-4 text-pink-600" />,
                text: "Tambah kategori → Pengaturan → Jenis Keperluan",
              },
            ].map(({ icon, text }, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-2 rounded-md bg-muted/40"
              >
                <span className="mt-0.5 flex-shrink-0">{icon}</span>
                <span className="text-slate-700 leading-snug">{text}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HelpCircle className="h-4 w-4" /> Pertanyaan Umum (FAQ)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {FAQ.map((f, i) => (
            <div key={i} className="border rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold hover:bg-muted/40 transition-colors"
                onClick={() => toggleFaq(i)}
              >
                <span>{f.q}</span>
                {openFaq === i ? (
                  <ChevronDown className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 flex-shrink-0" />
                )}
              </button>
              {openFaq === i && (
                <div className="px-4 pb-3 text-sm text-slate-600 leading-relaxed bg-muted/20">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Info versi */}
      <Card>
        <CardContent className="py-4 text-xs text-muted-foreground space-y-1">
          <div className="font-semibold text-sm text-slate-700">
            Informasi Aplikasi
          </div>
          <div>
            Versi: <strong>1.0.0</strong> &bull; Aplikasi Desktop Offline
          </div>
          <div>
            Pengembang: <strong className="text-slate-800">IrfanDev97</strong>
          </div>
          <div>
            Data tersimpan 100% lokal di komputer — tidak ada koneksi server
            atau internet.
          </div>
          <div>
            Riwayat kegiatan disimpan otomatis selama 6 bulan, lalu dibersihkan
            otomatis.
          </div>
          <div className="pt-1 text-amber-700 font-medium">
            ⚠ Buat cadangan data secara rutin minimal 1× seminggu!
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
