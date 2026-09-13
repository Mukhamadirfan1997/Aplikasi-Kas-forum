use crate::db::DbState;
use crate::models::{ProfilInput, ProfilOrganisasi};
use tauri::State;

fn row_to_profil(row: &rusqlite::Row) -> rusqlite::Result<ProfilOrganisasi> {
    Ok(ProfilOrganisasi {
        id: row.get(0)?,
        nama_forum: row.get(1)?,
        alamat: row.get(2)?,
        deskripsi: row.get(3)?,
        ketua_nama: row.get(4)?,
        ketua_nip: row.get(5)?,
        sekretaris_nama: row.get(6)?,
        sekretaris_nip: row.get(7)?,
        bendahara_nama: row.get(8)?,
        bendahara_nip: row.get(9)?,
        logo_base64: row.get(10)?,
        nominal_default: row.get::<_, Option<i64>>(11)?.unwrap_or(10000),
        updated_at: row.get(12)?,
    })
}

#[tauri::command]
pub fn get_profil(state: State<DbState>) -> Result<ProfilOrganisasi, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    // ensure row exists + migrate nominal_default if missing
    let _ = conn.execute("INSERT OR IGNORE INTO profil_organisasi(id) VALUES(1)", []);
    let _ = conn.execute("ALTER TABLE profil_organisasi ADD COLUMN nominal_default INTEGER NOT NULL DEFAULT 10000", []);
    let profil = conn
        .query_row(
            "SELECT id, nama_forum, alamat, deskripsi, ketua_nama, ketua_nip, sekretaris_nama, sekretaris_nip, bendahara_nama, bendahara_nip, logo_base64, nominal_default, updated_at FROM profil_organisasi WHERE id=1",
            [],
            row_to_profil,
        )
        .map_err(|e| e.to_string())?;
    Ok(profil)
}

#[tauri::command]
pub fn update_profil(state: State<DbState>, input: ProfilInput) -> Result<ProfilOrganisasi, String> {
    if input.nama_forum.trim().is_empty() {
        return Err("Nama forum wajib diisi".to_string());
    }
    if let Some(ref logo) = input.logo_base64 {
        // roughly check size: base64 length ~ 1.37 * bytes. Limit ~700k chars ~ 500KB
        if logo.len() > 700_000 {
            return Err("Logo terlalu besar, maksimal ~500KB".to_string());
        }
        if !logo.starts_with("data:image/") {
            return Err("Format logo harus dataURL image (png/jpg)".to_string());
        }
    }
    if let Some(n) = input.nominal_default {
        if n <= 0 || n > 10_000_000 {
            return Err("Nominal default harus 1 - 10.000.000".to_string());
        }
    }
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let _ = conn.execute("INSERT OR IGNORE INTO profil_organisasi(id) VALUES(1)", []);
    let _ = conn.execute("ALTER TABLE profil_organisasi ADD COLUMN nominal_default INTEGER NOT NULL DEFAULT 10000", []);
    // keep existing nominal_default if input is None
    let current_nominal: i64 = conn
        .query_row("SELECT COALESCE(nominal_default,10000) FROM profil_organisasi WHERE id=1", [], |r| r.get(0))
        .unwrap_or(10000);
    let nominal_to_save = input.nominal_default.unwrap_or(current_nominal);
    conn.execute(
        "UPDATE profil_organisasi SET nama_forum=?1, alamat=?2, deskripsi=?3, ketua_nama=?4, ketua_nip=?5, sekretaris_nama=?6, sekretaris_nip=?7, bendahara_nama=?8, bendahara_nip=?9, logo_base64=?10, nominal_default=?11, updated_at=datetime('now') WHERE id=1",
        rusqlite::params![
            input.nama_forum.trim(),
            input.alamat.as_deref().unwrap_or(""),
            input.deskripsi.as_deref().unwrap_or(""),
            input.ketua_nama.as_deref().unwrap_or(""),
            input.ketua_nip.as_deref().unwrap_or(""),
            input.sekretaris_nama.as_deref().unwrap_or(""),
            input.sekretaris_nip.as_deref().unwrap_or(""),
            input.bendahara_nama.as_deref().unwrap_or(""),
            input.bendahara_nip.as_deref().unwrap_or(""),
            input.logo_base64.as_deref(),
            nominal_to_save,
        ],
    )
    .map_err(|e| e.to_string())?;

    let profil = conn
        .query_row(
            "SELECT id, nama_forum, alamat, deskripsi, ketua_nama, ketua_nip, sekretaris_nama, sekretaris_nip, bendahara_nama, bendahara_nip, logo_base64, nominal_default, updated_at FROM profil_organisasi WHERE id=1",
            [],
            row_to_profil,
        )
        .map_err(|e| e.to_string())?;
    Ok(profil)
}
