use crate::db::DbState;
use crate::models::{KategoriTransaksi, KasInput, KasTransaksiView};
use rusqlite::params;
use tauri::State;

#[tauri::command]
pub fn get_kategori_list(state: State<DbState>) -> Result<Vec<KategoriTransaksi>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, nama, tipe FROM kategori_transaksi ORDER BY tipe, nama")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| Ok(KategoriTransaksi { id: r.get(0)?, nama: r.get(1)?, tipe: r.get(2)? }))
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

#[tauri::command]
pub fn add_kategori(state: State<DbState>, nama: String, tipe: String) -> Result<KategoriTransaksi, String> {
    let nama = nama.trim().to_string();
    if nama.is_empty() {
        return Err("Nama kategori wajib diisi".into());
    }
    if !["masuk", "keluar"].contains(&tipe.as_str()) {
        return Err("Tipe harus masuk/keluar".into());
    }
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO kategori_transaksi (nama, tipe) VALUES (?1, ?2)",
        params![nama, tipe],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    let k = KategoriTransaksi { id, nama, tipe };
    Ok(k)
}

#[tauri::command]
pub fn delete_kategori(state: State<DbState>, id: i64) -> Result<String, String> {
    // cegah hapus kategori 1 (Iuran) atau yang masih dipakai
    if id == 1 {
        return Err("Kategori Iuran tidak bisa dihapus".into());
    }
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let used: i64 = conn
        .query_row("SELECT COUNT(*) FROM kas_transaksi WHERE kategori_id = ?1", [id], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if used > 0 {
        return Err("Kategori masih dipakai transaksi — hapus/ubah transaksi dulu".into());
    }
    let aff = conn.execute("DELETE FROM kategori_transaksi WHERE id = ?1", [id]).map_err(|e| e.to_string())?;
    if aff == 0 {
        return Err("Kategori tidak ditemukan".into());
    }
    Ok("Kategori dihapus".into())
}

#[tauri::command]
pub fn get_kas_transaksi(
    state: State<DbState>,
    tipe: Option<String>,
    kategori_id: Option<i64>,
    dari: Option<String>,
    sampai: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<KasTransaksiView>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut sql = String::from(
        "SELECT k.id, k.tipe, k.kategori_id, c.nama, k.nominal, k.tanggal, k.keterangan, k.referensi_pembayaran_id, k.bukti, k.penanggung_jawab, k.created_at \
         FROM kas_transaksi k LEFT JOIN kategori_transaksi c ON c.id = k.kategori_id WHERE 1=1",
    );
    let mut params_vec: Vec<String> = Vec::new();
    // kita build query dengan params manual, tapi rusqlite positional susah dinamis — pakai format sementara (tipe sudah validasi)
    if let Some(t) = tipe {
        if ["masuk", "keluar"].contains(&t.as_str()) {
            sql.push_str(&format!(" AND k.tipe = '{}'", t));
        }
    }
    if let Some(kid) = kategori_id {
        sql.push_str(&format!(" AND k.kategori_id = {}", kid));
    }
    if let Some(d) = dari {
        if d.len() == 10 {
            sql.push_str(&format!(" AND k.tanggal >= '{}'", d));
            params_vec.push(d);
        }
    }
    if let Some(s) = sampai {
        if s.len() == 10 {
            sql.push_str(&format!(" AND k.tanggal <= '{}'", s));
            params_vec.push(s);
        }
    }
    sql.push_str(" ORDER BY k.tanggal DESC, k.id DESC");
    let lim = limit.unwrap_or(200).clamp(1, 1000);
    sql.push_str(&format!(" LIMIT {}", lim));

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| {
            Ok(KasTransaksiView {
                id: r.get(0)?,
                tipe: r.get(1)?,
                kategori_id: r.get(2)?,
                kategori_nama: r.get(3)?,
                nominal: r.get(4)?,
                tanggal: r.get(5)?,
                keterangan: r.get(6)?,
                referensi_pembayaran_id: r.get(7)?,
                bukti: r.get(8)?,
                penanggung_jawab: r.get(9)?,
                created_at: r.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

#[tauri::command]
pub fn add_kas_transaksi(state: State<DbState>, input: KasInput) -> Result<KasTransaksiView, String> {
    let tipe = input.tipe.trim().to_string();
    if !["masuk", "keluar"].contains(&tipe.as_str()) {
        return Err("Tipe harus masuk atau keluar".into());
    }
    if input.nominal <= 0 {
        return Err("Nominal harus > 0".into());
    }
    if input.keterangan.trim().is_empty() {
        return Err("Keterangan wajib diisi".into());
    }
    if input.tanggal.len() != 10 {
        return Err("Tanggal harus YYYY-MM-DD".into());
    }
    // kategori wajib untuk keluar, optional untuk masuk
    if tipe == "keluar" && input.kategori_id.is_none() {
        return Err("Kategori wajib untuk transaksi keluar".into());
    }
    // bukti wajib untuk keluar (nota / bukti transfer)
    if tipe == "keluar" {
        let bukti = input.bukti.as_deref().unwrap_or("").trim();
        if bukti.is_empty() {
            return Err("Wajib upload bukti pengeluaran (foto nota / bukti transfer)".into());
        }
    }
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(kid) = input.kategori_id {
        let exists: i64 = conn
            .query_row("SELECT COUNT(*) FROM kategori_transaksi WHERE id = ?1 AND tipe = ?2", params![kid, tipe], |r| r.get(0))
            .map_err(|e| e.to_string())?;
        if exists == 0 {
            return Err("Kategori tidak ditemukan / tipe tidak cocok".into());
        }
    }
    // cegah kas minus untuk keluar
    if tipe == "keluar" {
        let masuk: i64 = conn
            .query_row("SELECT COALESCE(SUM(nominal),0) FROM kas_transaksi WHERE tipe='masuk'", [], |r| r.get(0))
            .map_err(|e| e.to_string())?;
        let keluar: i64 = conn
            .query_row("SELECT COALESCE(SUM(nominal),0) FROM kas_transaksi WHERE tipe='keluar'", [], |r| r.get(0))
            .map_err(|e| e.to_string())?;
        let saldo = masuk - keluar;
        if input.nominal > saldo {
            return Err(format!("Saldo tidak cukup. Saldo saat ini {}.", crate::models::KasTransaksiView { id: 0, tipe: String::new(), kategori_id: None, kategori_nama: None, nominal: saldo, tanggal: String::new(), keterangan: String::new(), referensi_pembayaran_id: None, bukti: None, penanggung_jawab: None, created_at: String::new() }.nominal));
        }
    }
    let pj = input.penanggung_jawab.as_deref().map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
    conn.execute(
        "INSERT INTO kas_transaksi (tipe, kategori_id, nominal, tanggal, keterangan, bukti, penanggung_jawab) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![tipe, input.kategori_id, input.nominal, input.tanggal, input.keterangan.trim(), input.bukti, pj],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    let mut stmt = conn
        .prepare("SELECT k.id, k.tipe, k.kategori_id, c.nama, k.nominal, k.tanggal, k.keterangan, k.referensi_pembayaran_id, k.bukti, k.penanggung_jawab, k.created_at FROM kas_transaksi k LEFT JOIN kategori_transaksi c ON c.id = k.kategori_id WHERE k.id = ?1")
        .map_err(|e| e.to_string())?;
    let view = stmt
        .query_row([id], |r| {
            Ok(KasTransaksiView {
                id: r.get(0)?,
                tipe: r.get(1)?,
                kategori_id: r.get(2)?,
                kategori_nama: r.get(3)?,
                nominal: r.get(4)?,
                tanggal: r.get(5)?,
                keterangan: r.get(6)?,
                referensi_pembayaran_id: r.get(7)?,
                bukti: r.get(8)?,
                penanggung_jawab: r.get(9)?,
                created_at: r.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?;
    Ok(view)
}

#[tauri::command]
pub fn delete_kas_transaksi(state: State<DbState>, id: i64) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    // cegah hapus kas yang referensi dari iuran — harus via batal iuran
    let ref_id: Option<i64> = conn
        .query_row("SELECT referensi_pembayaran_id FROM kas_transaksi WHERE id = ?1", [id], |r| r.get(0))
        .map_err(|_| "Transaksi tidak ditemukan".to_string())?;
    if ref_id.is_some() {
        return Err("Transaksi iuran tidak bisa dihapus di sini — batalkan via halaman Iuran".into());
    }
    let aff = conn.execute("DELETE FROM kas_transaksi WHERE id = ?1", [id]).map_err(|e| e.to_string())?;
    if aff == 0 {
        return Err("Transaksi tidak ditemukan".into());
    }
    Ok("Transaksi dihapus".into())
}

#[tauri::command]
pub fn get_saldo_detail(state: State<DbState>) -> Result<serde_json::Value, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let masuk: i64 = conn
        .query_row("SELECT COALESCE(SUM(nominal),0) FROM kas_transaksi WHERE tipe='masuk'", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    let keluar: i64 = conn
        .query_row("SELECT COALESCE(SUM(nominal),0) FROM kas_transaksi WHERE tipe='keluar'", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    let ym = chrono::Local::now().format("%Y-%m").to_string();
    let masuk_bulan: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(nominal),0) FROM kas_transaksi WHERE tipe='masuk' AND substr(tanggal,1,7)=?1",
            [&ym],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    let keluar_bulan: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(nominal),0) FROM kas_transaksi WHERE tipe='keluar' AND substr(tanggal,1,7)=?1",
            [&ym],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "saldo": masuk - keluar, "total_masuk": masuk, "total_keluar": keluar, "masuk_bulan": masuk_bulan, "keluar_bulan": keluar_bulan }))
}
