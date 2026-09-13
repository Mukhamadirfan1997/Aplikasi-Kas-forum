// Penamaan file otomatis — defaultPath terisi rapi tapi user tetap bisa rename di dialog save (Tauri) atau download.
// Semua nama di-sanitize agar aman di Windows/macOS/Linux.

function sanitize(str: string): string {
  return str
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function slugForum(namaForum: string | null | undefined): string {
  const raw = (namaForum || "Forum-PPPK").trim();
  // hilangkan simbol, ganti spasi jadi dash, kecilkan? keep Capital untuk rapi
  const s = raw.replace(/[^a-zA-Z0-9 _-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
  return sanitize(s) || "Forum-PPPK";
}

export function stampNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export function laporanFileName(
  namaForum: string | null | undefined,
  dari: string,
  sampai: string,
  tipe: string,
  ext: string,
): string {
  const slug = slugForum(namaForum);
  const t = tipe && tipe !== "all" ? sanitize(tipe) : "semua";
  const stamp = stampNow();
  // contoh: Forum-PPPK-Laporan-Kas-2026-09-01_sd_2026-09-13-semua-20260913_1430.pdf
  return `${slug}-Laporan-Kas-${sanitize(dari)}_sd_${sanitize(sampai)}-${t}-${stamp}.${ext}`;
}

export function checklistFileName(namaForum: string | null | undefined, tahun: number, ext = "xlsx"): string {
  const slug = slugForum(namaForum);
  return `${slug}-Daftar-Iuran-${tahun}-${stampNow()}.${ext}`;
}

export function riwayatFileName(namaForum: string | null | undefined, ext = "xlsx"): string {
  const slug = slugForum(namaForum);
  return `${slug}-Riwayat-${stampNow()}.${ext}`;
}

export function templateAnggotaFileName(namaForum: string | null | undefined): string {
  const slug = slugForum(namaForum);
  return `Template-Anggota-${slug}.xlsx`;
}

export function buktiFileName(prefix: string, ext: string): string {
  // prefix mis. bukti-laporan-2026-09-13
  return `${sanitize(prefix)}-${stampNow()}.${sanitize(ext)}`;
}
