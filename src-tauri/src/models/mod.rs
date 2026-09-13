use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Anggota {
    pub id: i64,
    pub nama: String,
    pub nip_nuptk: Option<String>,
    pub unit_kerja: String,
    pub no_hp: Option<String>,
    pub status_aktif: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AnggotaInput {
    pub nama: String,
    pub nip_nuptk: Option<String>,
    pub unit_kerja: String,
    pub no_hp: Option<String>,
    pub status_aktif: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PeriodeIuran {
    pub id: i64,
    pub bulan: i32,
    pub tahun: i32,
    pub nominal_wajib: i64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PembayaranIuran {
    pub id: i64,
    pub anggota_id: i64,
    pub periode_id: i64,
    pub tanggal_bayar: String,
    pub nominal: i64,
    pub metode: String,
    pub keterangan: Option<String>,
    pub bukti_transfer: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KategoriTransaksi {
    pub id: i64,
    pub nama: String,
    pub tipe: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KasTransaksi {
    pub id: i64,
    pub tipe: String,
    pub kategori_id: Option<i64>,
    pub nominal: i64,
    pub tanggal: String,
    pub keterangan: String,
    pub referensi_pembayaran_id: Option<i64>,
    pub bukti: Option<String>,
    pub penanggung_jawab: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserPublic {
    pub id: i64,
    pub nama: String,
    pub username: String,
    pub role: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserInput {
    pub nama: String,
    pub username: String,
    pub password: String,
    pub role: String, // admin|bendahara|viewer
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginInput {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserUpdateInput {
    pub nama: String,
    pub username: String,
    pub role: String, // admin|bendahara|viewer
    pub password: Option<String>, // None = tidak ganti, Some = ganti (minimal 4)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IuranStatus {
    pub anggota: Anggota,
    pub pembayaran: Option<PembayaranIuran>,
    pub sudah_bayar: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BulkBayarInput {
    pub periode_id: i64,
    pub anggota_ids: Vec<i64>,
    pub tanggal_bayar: String, // YYYY-MM-DD
    pub metode: String,        // tunai|transfer
    pub keterangan: Option<String>,
    pub bukti_transfer: Option<String>, // base64 dataURL atau path, wajib jika transfer
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KasTransaksiView {
    pub id: i64,
    pub tipe: String,
    pub kategori_id: Option<i64>,
    pub kategori_nama: Option<String>,
    pub nominal: i64,
    pub tanggal: String,
    pub keterangan: String,
    pub referensi_pembayaran_id: Option<i64>,
    pub bukti: Option<String>,
    pub penanggung_jawab: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BayarSetahunInput {
    pub anggota_id: i64,
    pub tahun: i32,
    pub tanggal_bayar: String,
    pub metode: String,
    pub keterangan: Option<String>,
    pub bukti_transfer: Option<String>,
    pub bulan_list: Option<Vec<i32>>, // jika None = Jan-Des (12), jika Some = subset
}

#[derive(Debug, Serialize, Deserialize)]
pub struct KasInput {
    pub tipe: String, // masuk|keluar
    pub kategori_id: Option<i64>,
    pub nominal: i64,
    pub tanggal: String, // YYYY-MM-DD
    pub keterangan: String,
    pub bukti: Option<String>, // base64 nota/bukti, wajib untuk keluar
    pub penanggung_jawab: Option<String>, // nama anggota penanggung jawab (opsional, teks bebas)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportAnggotaRow {
    pub nama: String,
    pub nip_nuptk: String,
    pub unit_kerja: String,
    pub no_hp: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RiwayatKegiatan {
    pub id: i64,
    pub waktu: String,
    pub username: String,
    pub aksi: String,
    pub detail: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProfilOrganisasi {
    pub id: i64,
    pub nama_forum: String,
    pub alamat: Option<String>,
    pub deskripsi: Option<String>,
    pub ketua_nama: Option<String>,
    pub ketua_nip: Option<String>,
    pub sekretaris_nama: Option<String>,
    pub sekretaris_nip: Option<String>,
    pub bendahara_nama: Option<String>,
    pub bendahara_nip: Option<String>,
    pub logo_base64: Option<String>,
    pub nominal_default: i64,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProfilInput {
    pub nama_forum: String,
    pub alamat: Option<String>,
    pub deskripsi: Option<String>,
    pub ketua_nama: Option<String>,
    pub ketua_nip: Option<String>,
    pub sekretaris_nama: Option<String>,
    pub sekretaris_nip: Option<String>,
    pub bendahara_nama: Option<String>,
    pub bendahara_nip: Option<String>,
    pub logo_base64: Option<String>,
    pub nominal_default: Option<i64>,
}
