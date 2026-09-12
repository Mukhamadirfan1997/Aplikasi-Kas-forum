use crate::db::DbState;
use crate::models::RiwayatKegiatan;
use rusqlite::params;
use tauri::State;

#[tauri::command]
pub fn tulis_riwayat(state: State<DbState>, username: String, aksi: String, detail: Option<String>) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO riwayat_kegiatan (username, aksi, detail) VALUES (?1, ?2, ?3)",
        params![username.trim(), aksi.trim(), detail],
    )
    .map_err(|e| e.to_string())?;
    Ok("ok".into())
}

#[tauri::command]
pub fn get_riwayat(
    state: State<DbState>,
    dari: Option<String>,
    sampai: Option<String>,
    aksi: Option<String>,
    cari: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<RiwayatKegiatan>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut sql = String::from("SELECT id, waktu, username, aksi, detail FROM riwayat_kegiatan WHERE 1=1");
    if let Some(d) = dari { if d.len() == 10 { sql.push_str(&format!(" AND date(waktu) >= date('{}')", d)); } }
    if let Some(s) = sampai { if s.len() == 10 { sql.push_str(&format!(" AND date(waktu) <= date('{}')", s)); } }
    if let Some(a) = aksi { if !a.is_empty() && a != "Semua" { sql.push_str(&format!(" AND aksi = '{}'", a.replace('\'', "''"))); } }
    if let Some(c) = cari { if !c.trim().is_empty() { let esc = c.replace('\'', "''"); sql.push_str(&format!(" AND (username LIKE '%{}%' OR detail LIKE '%{}%')", esc, esc)); } }
    sql.push_str(" ORDER BY waktu DESC, id DESC");
    let lim = limit.unwrap_or(200).clamp(1, 1000);
    sql.push_str(&format!(" LIMIT {}", lim));
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |r| Ok(RiwayatKegiatan { id: r.get(0)?, waktu: r.get(1)?, username: r.get(2)?, aksi: r.get(3)?, detail: r.get(4)? })).map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}

#[tauri::command]
pub fn hapus_riwayat_lama(state: State<DbState>) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let n = conn.execute("DELETE FROM riwayat_kegiatan WHERE waktu < datetime('now','-6 months')", []).map_err(|e| e.to_string())?;
    Ok(format!("{} riwayat lama dihapus", n))
}

#[tauri::command]
pub fn hapus_semua_riwayat(state: State<DbState>) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM riwayat_kegiatan", []).map_err(|e| e.to_string())?;
    Ok("Semua riwayat dihapus".into())
}
