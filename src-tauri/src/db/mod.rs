pub mod migration;

use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

pub struct DbState(pub Mutex<Connection>);

pub fn get_db_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Gagal mendapatkan app_data_dir: {}", e))?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("Gagal membuat folder database: {}", e))?;
    Ok(dir.join("kas.db"))
}

pub fn init_db(app_handle: &tauri::AppHandle) -> Result<Connection, String> {
    let db_path = get_db_path(app_handle)?;
    let conn = Connection::open(&db_path).map_err(|e| format!("Gagal membuka database: {}", e))?;
    conn.execute_batch(migration::MIGRATION_SQL)
        .map_err(|e| format!("Gagal menjalankan migration: {}", e))?;
    // Migrasi tambahan: kolom bukti untuk pembayaran & kas (abaikan jika sudah ada)
    let _ = conn.execute("ALTER TABLE pembayaran_iuran ADD COLUMN bukti_transfer TEXT", []);
    let _ = conn.execute("ALTER TABLE kas_transaksi ADD COLUMN bukti TEXT", []);
    let _ = conn.execute("ALTER TABLE kas_transaksi ADD COLUMN penanggung_jawab TEXT", []);
    // tabel profil_organisasi (migrasi untuk DB lama)
    let _ = conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS profil_organisasi (id INTEGER PRIMARY KEY CHECK(id=1), nama_forum TEXT NOT NULL DEFAULT 'Forum PPPK', alamat TEXT DEFAULT '', deskripsi TEXT DEFAULT '', ketua_nama TEXT DEFAULT '', ketua_nip TEXT DEFAULT '', sekretaris_nama TEXT DEFAULT '', sekretaris_nip TEXT DEFAULT '', bendahara_nama TEXT DEFAULT '', bendahara_nip TEXT DEFAULT '', logo_base64 TEXT, updated_at TEXT NOT NULL DEFAULT (datetime('now'))); INSERT OR IGNORE INTO profil_organisasi(id) VALUES(1);",
    );
    let _ = conn.execute("ALTER TABLE profil_organisasi ADD COLUMN alamat TEXT DEFAULT ''", []);
    let _ = conn.execute("ALTER TABLE profil_organisasi ADD COLUMN deskripsi TEXT DEFAULT ''", []);
    let _ = conn.execute("ALTER TABLE profil_organisasi ADD COLUMN ketua_nama TEXT DEFAULT ''", []);
    let _ = conn.execute("ALTER TABLE profil_organisasi ADD COLUMN ketua_nip TEXT DEFAULT ''", []);
    let _ = conn.execute("ALTER TABLE profil_organisasi ADD COLUMN sekretaris_nama TEXT DEFAULT ''", []);
    let _ = conn.execute("ALTER TABLE profil_organisasi ADD COLUMN sekretaris_nip TEXT DEFAULT ''", []);
    let _ = conn.execute("ALTER TABLE profil_organisasi ADD COLUMN bendahara_nama TEXT DEFAULT ''", []);
    let _ = conn.execute("ALTER TABLE profil_organisasi ADD COLUMN bendahara_nip TEXT DEFAULT ''", []);
    let _ = conn.execute("ALTER TABLE profil_organisasi ADD COLUMN logo_base64 TEXT", []);
    // tabel riwayat untuk audit 6 bulan
    let _ = conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS riwayat_kegiatan (id INTEGER PRIMARY KEY AUTOINCREMENT, waktu TEXT NOT NULL DEFAULT (datetime('now')), username TEXT NOT NULL, aksi TEXT NOT NULL, detail TEXT);",
    );
    // auto hapus riwayat >6 bulan
    let _ = conn.execute("DELETE FROM riwayat_kegiatan WHERE waktu < datetime('now','-6 months')", []);
    // Pastikan foreign keys aktif setiap koneksi
    conn.execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|e| e.to_string())?;
    // Seed default admin jika belum ada user sama sekali
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if count == 0 {
        let hash = bcrypt::hash("admin123", 10).map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO users (nama, username, password_hash, role) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params!["Administrator", "admin", hash, "admin"],
        )
        .map_err(|e| e.to_string())?;
        println!("Seed default user: admin / admin123");
    }
    println!("Database siap di: {}", db_path.display());
    Ok(conn)
}
