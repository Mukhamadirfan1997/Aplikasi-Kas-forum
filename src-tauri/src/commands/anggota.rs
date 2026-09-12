use crate::db::DbState;
use crate::models::{Anggota, AnggotaInput};
use rusqlite::params;
use tauri::State;

// GET - semua anggota dengan filter opsional
#[tauri::command]
pub fn get_anggota(state: State<DbState>, search: Option<String>, status_aktif: Option<bool>) -> Result<Vec<Anggota>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut query = String::from("SELECT id, nama, nip_nuptk, unit_kerja, no_hp, status_aktif, created_at, updated_at FROM anggota WHERE 1=1");
    let mut params_vec: Vec<String> = vec![];

    if let Some(s) = search {
        if !s.trim().is_empty() {
            query.push_str(" AND (nama LIKE ?1 OR unit_kerja LIKE ?1 OR nip_nuptk LIKE ?1)");
            params_vec.push(format!("%{}%", s));
        }
    }
    if let Some(st) = status_aktif {
        query.push_str(&format!(" AND status_aktif = {}", if st { 1 } else { 0 }));
    }
    query.push_str(" ORDER BY nama ASC");

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    if params_vec.is_empty() {
        let rows = stmt
            .query_map([], |row| {
                Ok(Anggota {
                    id: row.get(0)?,
                    nama: row.get(1)?,
                    nip_nuptk: row.get(2)?,
                    unit_kerja: row.get(3)?,
                    no_hp: row.get(4)?,
                    status_aktif: row.get::<_, i32>(5)? != 0,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                })
            })
            .map_err(|e| e.to_string())?;
        for r in rows {
            result.push(r.map_err(|e| e.to_string())?);
        }
    } else {
        let like = params_vec[0].clone();
        let rows = stmt
            .query_map(params![like], |row| {
                Ok(Anggota {
                    id: row.get(0)?,
                    nama: row.get(1)?,
                    nip_nuptk: row.get(2)?,
                    unit_kerja: row.get(3)?,
                    no_hp: row.get(4)?,
                    status_aktif: row.get::<_, i32>(5)? != 0,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                })
            })
            .map_err(|e| e.to_string())?;
        for r in rows {
            result.push(r.map_err(|e| e.to_string())?);
        }
    }
    Ok(result)
}

#[tauri::command]
pub fn add_anggota(state: State<DbState>, input: AnggotaInput) -> Result<Anggota, String> {
    if input.nama.trim().is_empty() {
        return Err("Nama tidak boleh kosong".into());
    }
    if input.unit_kerja.trim().is_empty() {
        return Err("Unit kerja tidak boleh kosong".into());
    }
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO anggota (nama, nip_nuptk, unit_kerja, no_hp, status_aktif) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            input.nama.trim(),
            input.nip_nuptk,
            input.unit_kerja.trim(),
            input.no_hp,
            if input.status_aktif.unwrap_or(true) { 1 } else { 0 }
        ],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    let mut stmt = conn
        .prepare("SELECT id, nama, nip_nuptk, unit_kerja, no_hp, status_aktif, created_at, updated_at FROM anggota WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    let anggota = stmt
        .query_row([id], |row| {
            Ok(Anggota {
                id: row.get(0)?,
                nama: row.get(1)?,
                nip_nuptk: row.get(2)?,
                unit_kerja: row.get(3)?,
                no_hp: row.get(4)?,
                status_aktif: row.get::<_, i32>(5)? != 0,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;
    Ok(anggota)
}

#[tauri::command]
pub fn update_anggota(state: State<DbState>, id: i64, input: AnggotaInput) -> Result<Anggota, String> {
    if input.nama.trim().is_empty() {
        return Err("Nama tidak boleh kosong".into());
    }
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let affected = conn
        .execute(
            "UPDATE anggota SET nama=?1, nip_nuptk=?2, unit_kerja=?3, no_hp=?4, status_aktif=?5, updated_at=datetime('now') WHERE id=?6",
            params![
                input.nama.trim(),
                input.nip_nuptk,
                input.unit_kerja.trim(),
                input.no_hp,
                if input.status_aktif.unwrap_or(true) { 1 } else { 0 },
                id
            ],
        )
        .map_err(|e| e.to_string())?;
    if affected == 0 {
        return Err("Anggota tidak ditemukan".into());
    }
    let mut stmt = conn
        .prepare("SELECT id, nama, nip_nuptk, unit_kerja, no_hp, status_aktif, created_at, updated_at FROM anggota WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    let anggota = stmt
        .query_row([id], |row| {
            Ok(Anggota {
                id: row.get(0)?,
                nama: row.get(1)?,
                nip_nuptk: row.get(2)?,
                unit_kerja: row.get(3)?,
                no_hp: row.get(4)?,
                status_aktif: row.get::<_, i32>(5)? != 0,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;
    Ok(anggota)
}

#[tauri::command]
pub fn delete_anggota(state: State<DbState>, id: i64) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    // Soft delete: set status_aktif = 0, atau hard delete jika belum ada transaksi
    // Kita lakukan soft delete agar histori tidak hilang
    let affected = conn
        .execute("UPDATE anggota SET status_aktif=0, updated_at=datetime('now') WHERE id=?1", [id])
        .map_err(|e| e.to_string())?;
    if affected == 0 {
        return Err("Anggota tidak ditemukan".into());
    }
    Ok("Anggota dinonaktifkan".into())
}

#[tauri::command]
pub fn get_saldo(state: State<DbState>) -> Result<i64, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let masuk: Option<i64> = conn
        .query_row("SELECT COALESCE(SUM(nominal),0) FROM kas_transaksi WHERE tipe='masuk'", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    let keluar: Option<i64> = conn
        .query_row("SELECT COALESCE(SUM(nominal),0) FROM kas_transaksi WHERE tipe='keluar'", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    Ok(masuk.unwrap_or(0) - keluar.unwrap_or(0))
}

#[tauri::command]
pub fn bulk_import_anggota(state: State<DbState>, rows: Vec<crate::models::ImportAnggotaRow>) -> Result<serde_json::Value, String> {
    if rows.is_empty() {
        return Err("File kosong".into());
    }
    if rows.len() > 1000 {
        return Err("Maksimal 1000 baris per impor".into());
    }
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut sukses = 0;
    let mut gagal: Vec<serde_json::Value> = Vec::new();
    for (idx, r) in rows.iter().enumerate() {
        let baris = idx + 2; // header baris 1
        let nama = r.nama.trim();
        let nip = r.nip_nuptk.trim();
        let unit = r.unit_kerja.trim();
        let hp = r.no_hp.trim();
        if nama.is_empty() || nip.is_empty() || unit.is_empty() || hp.is_empty() {
            gagal.push(serde_json::json!({ "baris": baris, "nama": nama, "alasan": "4 kolom wajib diisi (Nama, NIP, Unit, No HP)" }));
            continue;
        }
        let res = conn.execute(
            "INSERT INTO anggota (nama, nip_nuptk, unit_kerja, no_hp, status_aktif) VALUES (?1, ?2, ?3, ?4, 1)",
            params![nama, nip, unit, hp],
        );
        match res {
            Ok(_) => sukses += 1,
            Err(e) => gagal.push(serde_json::json!({ "baris": baris, "nama": nama, "alasan": e.to_string() })),
        }
    }
    Ok(serde_json::json!({ "sukses": sukses, "gagal": gagal, "total": rows.len() }))
}
