pub const MIGRATION_SQL: &str = r#"
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS anggota (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    nip_nuptk TEXT,
    unit_kerja TEXT NOT NULL,
    no_hp TEXT,
    status_aktif INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS periode_iuran (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bulan INTEGER NOT NULL CHECK (bulan >= 1 AND bulan <= 12),
    tahun INTEGER NOT NULL,
    nominal_wajib INTEGER NOT NULL DEFAULT 10000,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(bulan, tahun)
);

CREATE TABLE IF NOT EXISTS kategori_transaksi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    tipe TEXT NOT NULL CHECK (tipe IN ('masuk','keluar'))
);

CREATE TABLE IF NOT EXISTS pembayaran_iuran (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    anggota_id INTEGER NOT NULL,
    periode_id INTEGER NOT NULL,
    tanggal_bayar TEXT NOT NULL,
    nominal INTEGER NOT NULL,
    metode TEXT NOT NULL CHECK (metode IN ('tunai','transfer')),
    keterangan TEXT,
    bukti_transfer TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (anggota_id) REFERENCES anggota(id) ON DELETE CASCADE,
    FOREIGN KEY (periode_id) REFERENCES periode_iuran(id) ON DELETE CASCADE,
    UNIQUE(anggota_id, periode_id)
);

CREATE TABLE IF NOT EXISTS kas_transaksi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipe TEXT NOT NULL CHECK (tipe IN ('masuk','keluar')),
    kategori_id INTEGER,
    nominal INTEGER NOT NULL,
    tanggal TEXT NOT NULL,
    keterangan TEXT NOT NULL,
    referensi_pembayaran_id INTEGER,
    bukti TEXT,
    penanggung_jawab TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (kategori_id) REFERENCES kategori_transaksi(id) ON DELETE SET NULL,
    FOREIGN KEY (referensi_pembayaran_id) REFERENCES pembayaran_iuran(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin','bendahara','viewer')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS riwayat_kegiatan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    waktu TEXT NOT NULL DEFAULT (datetime('now')),
    username TEXT NOT NULL,
    aksi TEXT NOT NULL,
    detail TEXT
);

CREATE TABLE IF NOT EXISTS profil_organisasi (
    id INTEGER PRIMARY KEY CHECK(id=1),
    nama_forum TEXT NOT NULL DEFAULT 'Forum PPPK',
    alamat TEXT DEFAULT '',
    deskripsi TEXT DEFAULT '',
    ketua_nama TEXT DEFAULT '',
    ketua_nip TEXT DEFAULT '',
    sekretaris_nama TEXT DEFAULT '',
    sekretaris_nip TEXT DEFAULT '',
    bendahara_nama TEXT DEFAULT '',
    bendahara_nip TEXT DEFAULT '',
    logo_base64 TEXT,
    nominal_default INTEGER NOT NULL DEFAULT 10000,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO profil_organisasi(id) VALUES(1);

-- Default kategori
INSERT OR IGNORE INTO kategori_transaksi (id, nama, tipe) VALUES (1, 'Iuran Anggota', 'masuk');
INSERT OR IGNORE INTO kategori_transaksi (id, nama, tipe) VALUES (2, 'Konsumsi', 'keluar');
INSERT OR IGNORE INTO kategori_transaksi (id, nama, tipe) VALUES (3, 'ATK', 'keluar');
INSERT OR IGNORE INTO kategori_transaksi (id, nama, tipe) VALUES (4, 'Kegiatan', 'keluar');
INSERT OR IGNORE INTO kategori_transaksi (id, nama, tipe) VALUES (5, 'Lain-lain', 'keluar');
INSERT OR IGNORE INTO kategori_transaksi (id, nama, tipe) VALUES (6, 'Saldo Awal', 'masuk');
"#;
