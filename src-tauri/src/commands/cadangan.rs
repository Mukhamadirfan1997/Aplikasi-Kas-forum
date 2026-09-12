use crate::db::{get_db_path, DbState};
use rusqlite::params;
use std::fs;
use std::path::PathBuf;
use tauri::{Manager, State};

fn backup_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let b = dir.join("backup");
    fs::create_dir_all(&b).map_err(|e| e.to_string())?;
    Ok(b)
}

#[tauri::command]
pub fn buat_cadangan(state: State<DbState>, app_handle: tauri::AppHandle) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    // checkpoint WAL
    let _ = conn.execute("PRAGMA wal_checkpoint(TRUNCATE)", []);
    drop(conn);
    let db_path = get_db_path(&app_handle)?;
    let bdir = backup_dir(&app_handle)?;
    let stamp = chrono::Local::now().format("%Y-%m-%d_%H%M%S").to_string();
    let dest = bdir.join(format!("kas-{}.db", stamp));
    fs::copy(&db_path, &dest).map_err(|e| e.to_string())?;
    // juga copy wal/shm jika ada
    for ext in ["wal", "shm"] {
        let p = PathBuf::from(format!("{}.{}", db_path.display(), ext));
        if p.exists() {
            let d = bdir.join(format!("kas-{}.db-{}", stamp, ext));
            let _ = fs::copy(p, d);
        }
    }
    // tulis riwayat
    if let Ok(c) = state.0.lock() {
        let _ = c.execute("INSERT INTO riwayat_kegiatan (username, aksi, detail) VALUES ('sistem','Cadangkan Data',?1)", params![dest.display().to_string()]);
    }
    Ok(dest.display().to_string())
}

#[tauri::command]
pub fn pulihkan_cadangan(state: State<DbState>, app_handle: tauri::AppHandle, file_path: String) -> Result<String, String> {
    let src = PathBuf::from(file_path.trim());
    if !src.exists() { return Err("File cadangan tidak ditemukan".into()); }
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let _ = conn.execute("PRAGMA wal_checkpoint(TRUNCATE)", []);
    drop(conn);
    let db_path = get_db_path(&app_handle)?;
    // backup current sebelum timpa
    let bdir = backup_dir(&app_handle)?;
    let pre = bdir.join(format!("kas-sebelum-pulih-{}.db", chrono::Local::now().format("%Y%m%d%H%M%S")));
    let _ = fs::copy(&db_path, &pre);
    fs::copy(&src, &db_path).map_err(|e| e.to_string())?;
    // hapus wal/shm lama biar tidak korup
    for ext in ["wal", "shm"] {
        let p = PathBuf::from(format!("{}.{}", db_path.display(), ext));
        let _ = fs::remove_file(p);
    }
    // reconnect check
    let new_conn = rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?;
    new_conn.execute_batch("PRAGMA foreign_keys=ON;").map_err(|e| e.to_string())?;
    // tulis riwayat ke conn baru (tapi DbState masih lock lama, jadi tulis via new_conn)
    let _ = new_conn.execute("INSERT INTO riwayat_kegiatan (username, aksi, detail) VALUES ('sistem','Pulihkan Data',?1)", params![src.display().to_string()]);
    // replace state conn: drop old, open new in state
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    *guard = new_conn;
    Ok(db_path.display().to_string())
}

#[tauri::command]
pub fn daftar_cadangan(app_handle: tauri::AppHandle) -> Result<Vec<String>, String> {
    let bdir = backup_dir(&app_handle)?;
    let mut out: Vec<String> = Vec::new();
    for e in fs::read_dir(&bdir).map_err(|e| e.to_string())? {
        let e = e.map_err(|e| e.to_string())?;
        if e.path().extension().map(|s| s=="db").unwrap_or(false) {
            out.push(e.path().display().to_string());
        }
    }
    out.sort(); out.reverse();
    Ok(out.into_iter().take(20).collect())
}

#[tauri::command]
pub fn info_cadangan(app_handle: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let db_path = get_db_path(&app_handle)?;
    let meta = fs::metadata(&db_path).map_err(|e| e.to_string())?;
    let size = meta.len();
    let modified = meta.modified().map_err(|e| e.to_string())?;
    let dt: chrono::DateTime<chrono::Local> = modified.into();
    let bdir = backup_dir(&app_handle)?;
    let count = fs::read_dir(&bdir).map(|r| r.count()).unwrap_or(0);
    Ok(serde_json::json!({ "path": db_path.display().to_string(), "size": size, "modified": dt.format("%Y-%m-%d %H:%M:%S").to_string(), "backup_count": count, "backup_dir": bdir.display().to_string() }))
}
