use crate::db::DbState;
use crate::models::{Anggota, IuranStatus, PembayaranIuran, PeriodeIuran, BulkBayarInput};
use rusqlite::params;
use tauri::State;

// helper
fn parse_periode(row: &rusqlite::Row) -> rusqlite::Result<PeriodeIuran> {
    Ok(PeriodeIuran {
        id: row.get(0)?,
        bulan: row.get(1)?,
        tahun: row.get(2)?,
        nominal_wajib: row.get(3)?,
        created_at: row.get(4)?,
    })
}

#[tauri::command]
pub fn get_periode_list(state: State<DbState>) -> Result<Vec<PeriodeIuran>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, bulan, tahun, nominal_wajib, created_at FROM periode_iuran ORDER BY tahun DESC, bulan DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], parse_periode).map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

#[tauri::command]
pub fn get_or_create_periode(
    state: State<DbState>,
    bulan: i32,
    tahun: i32,
    nominal_wajib: Option<i64>,
) -> Result<PeriodeIuran, String> {
    if !(1..=12).contains(&bulan) {
        return Err("Bulan harus 1-12".into());
    }
    if tahun < 2020 || tahun > 2100 {
        return Err("Tahun tidak valid".into());
    }
    let nominal = nominal_wajib.unwrap_or(10000);
    if nominal <= 0 {
        return Err("Nominal harus > 0".into());
    }
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    // coba insert or ignore
    conn.execute(
        "INSERT OR IGNORE INTO periode_iuran (bulan, tahun, nominal_wajib) VALUES (?1, ?2, ?3)",
        params![bulan, tahun, nominal],
    )
    .map_err(|e| e.to_string())?;
    // jika sudah ada tapi nominal diinput berbeda, update nominal? hanya jika explicit nominal_wajib diberikan
    if nominal_wajib.is_some() {
        conn.execute(
            "UPDATE periode_iuran SET nominal_wajib = ?1 WHERE bulan = ?2 AND tahun = ?3",
            params![nominal, bulan, tahun],
        )
        .map_err(|e| e.to_string())?;
    }
    let mut stmt = conn
        .prepare("SELECT id, bulan, tahun, nominal_wajib, created_at FROM periode_iuran WHERE bulan = ?1 AND tahun = ?2")
        .map_err(|e| e.to_string())?;
    let p = stmt.query_row(params![bulan, tahun], parse_periode).map_err(|e| e.to_string())?;
    Ok(p)
}

#[tauri::command]
pub fn update_periode_nominal(state: State<DbState>, periode_id: i64, nominal_wajib: i64) -> Result<PeriodeIuran, String> {
    if nominal_wajib <= 0 {
        return Err("Nominal harus > 0".into());
    }
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let affected = conn
        .execute("UPDATE periode_iuran SET nominal_wajib = ?1 WHERE id = ?2", params![nominal_wajib, periode_id])
        .map_err(|e| e.to_string())?;
    if affected == 0 {
        return Err("Periode tidak ditemukan".into());
    }
    let mut stmt = conn
        .prepare("SELECT id, bulan, tahun, nominal_wajib, created_at FROM periode_iuran WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    let p = stmt.query_row([periode_id], parse_periode).map_err(|e| e.to_string())?;
    Ok(p)
}

#[tauri::command]
pub fn get_iuran_status(state: State<DbState>, periode_id: i64) -> Result<Vec<IuranStatus>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    // pastikan periode ada
    let exists: i64 = conn
        .query_row("SELECT COUNT(*) FROM periode_iuran WHERE id = ?1", [periode_id], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if exists == 0 {
        return Err("Periode tidak ditemukan".into());
    }
    // ambil semua anggota aktif
    let mut stmt = conn
        .prepare("SELECT id, nama, nip_nuptk, unit_kerja, no_hp, status_aktif, created_at, updated_at FROM anggota WHERE status_aktif = 1 ORDER BY nama ASC")
        .map_err(|e| e.to_string())?;
    let anggota_rows = stmt
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
    let mut result = Vec::new();
    for a_res in anggota_rows {
        let a = a_res.map_err(|e| e.to_string())?;
        // cek pembayaran untuk anggota+periode (termasuk bukti_transfer)
        let mut p_stmt = conn
            .prepare("SELECT id, anggota_id, periode_id, tanggal_bayar, nominal, metode, keterangan, bukti_transfer, created_at FROM pembayaran_iuran WHERE anggota_id = ?1 AND periode_id = ?2 LIMIT 1")
            .map_err(|e| e.to_string())?;
        let pembayaran: Option<PembayaranIuran> = {
            let mut rows = p_stmt.query(params![a.id, periode_id]).map_err(|e| e.to_string())?;
            if let Some(row) = rows.next().map_err(|e| e.to_string())? {
                Some(PembayaranIuran {
                    id: row.get(0).map_err(|e| e.to_string())?,
                    anggota_id: row.get(1).map_err(|e| e.to_string())?,
                    periode_id: row.get(2).map_err(|e| e.to_string())?,
                    tanggal_bayar: row.get(3).map_err(|e| e.to_string())?,
                    nominal: row.get(4).map_err(|e| e.to_string())?,
                    metode: row.get(5).map_err(|e| e.to_string())?,
                    keterangan: row.get(6).map_err(|e| e.to_string())?,
                    bukti_transfer: row.get(7).map_err(|e| e.to_string())?,
                    created_at: row.get(8).map_err(|e| e.to_string())?,
                })
            } else {
                None
            }
        };
        let sudah = pembayaran.is_some();
        result.push(IuranStatus {
            anggota: a,
            pembayaran,
            sudah_bayar: sudah,
        });
    }
    Ok(result)
}

#[tauri::command]
pub fn bayar_iuran_bulk(state: State<DbState>, input: BulkBayarInput) -> Result<Vec<PembayaranIuran>, String> {
    if input.anggota_ids.is_empty() {
        return Err("Pilih minimal 1 anggota".into());
    }
    if !["tunai", "transfer"].contains(&input.metode.as_str()) {
        return Err("Metode harus tunai atau transfer".into());
    }
    if input.metode == "transfer" {
        let bukti = input.bukti_transfer.as_deref().unwrap_or("").trim();
        if bukti.is_empty() {
            return Err("Bukti transfer wajib diupload untuk metode transfer".into());
        }
    }
    // validasi tanggal_bayar sederhana YYYY-MM-DD
    if input.tanggal_bayar.len() != 10 {
        return Err("Tanggal bayar harus format YYYY-MM-DD".into());
    }
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // ambil periode untuk nominal default
    let periode: PeriodeIuran = {
        let mut stmt = conn
            .prepare("SELECT id, bulan, tahun, nominal_wajib, created_at FROM periode_iuran WHERE id = ?1")
            .map_err(|e| e.to_string())?;
        stmt.query_row([input.periode_id], parse_periode)
            .map_err(|_| "Periode tidak ditemukan".to_string())?
    };

    let mut created: Vec<PembayaranIuran> = Vec::new();
    for anggota_id in &input.anggota_ids {
        // cek anggota aktif
        let cek: i64 = conn
            .query_row("SELECT COUNT(*) FROM anggota WHERE id = ?1 AND status_aktif = 1", [*anggota_id], |r| r.get(0))
            .map_err(|e| e.to_string())?;
        if cek == 0 {
            return Err(format!("Anggota id {} tidak ditemukan / nonaktif", anggota_id));
        }
        // insert pembayaran — unique constraint akan error jika sudah bayar
        let res = conn.execute(
            "INSERT INTO pembayaran_iuran (anggota_id, periode_id, tanggal_bayar, nominal, metode, keterangan, bukti_transfer) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![*anggota_id, input.periode_id, input.tanggal_bayar, periode.nominal_wajib, input.metode, input.keterangan, input.bukti_transfer],
        );
        if let Err(e) = res {
            let msg = e.to_string();
            if msg.contains("UNIQUE") {
                return Err(format!("Anggota id {} sudah bayar periode ini", anggota_id));
            }
            return Err(msg);
        }
        let pid = conn.last_insert_rowid();
        // buat kas_transaksi masuk
        let anggota_nama: String = conn
            .query_row("SELECT nama FROM anggota WHERE id = ?1", [*anggota_id], |r| r.get(0))
            .map_err(|e| e.to_string())?;
        let keterangan = format!("Iuran {}-{} - {}", periode.bulan, periode.tahun, anggota_nama);
        conn.execute(
            "INSERT INTO kas_transaksi (tipe, kategori_id, nominal, tanggal, keterangan, referensi_pembayaran_id) VALUES ('masuk', 1, ?1, ?2, ?3, ?4)",
            params![periode.nominal_wajib, input.tanggal_bayar, keterangan, pid],
        )
        .map_err(|e| e.to_string())?;

        let pembayaran = PembayaranIuran {
            id: pid,
            anggota_id: *anggota_id,
            periode_id: input.periode_id,
            tanggal_bayar: input.tanggal_bayar.clone(),
            nominal: periode.nominal_wajib,
            metode: input.metode.clone(),
            keterangan: input.keterangan.clone(),
            bukti_transfer: input.bukti_transfer.clone(),
            created_at: chrono::Utc::now().to_string(),
        };
        created.push(pembayaran);
    }
    Ok(created)
}

#[tauri::command]
pub fn hapus_pembayaran(state: State<DbState>, pembayaran_id: i64) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    // hapus kas_transaksi yang referensi ke pembayaran ini dulu
    conn.execute("DELETE FROM kas_transaksi WHERE referensi_pembayaran_id = ?1", [pembayaran_id])
        .map_err(|e| e.to_string())?;
    let affected = conn
        .execute("DELETE FROM pembayaran_iuran WHERE id = ?1", [pembayaran_id])
        .map_err(|e| e.to_string())?;
    if affected == 0 {
        return Err("Pembayaran tidak ditemukan".into());
    }
    Ok("Pembayaran dibatalkan".into())
}

#[tauri::command]
pub fn get_checklist_matrix(state: State<DbState>, tahun: i32) -> Result<Vec<serde_json::Value>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    // ambil semua anggota aktif
    let mut stmt = conn
        .prepare("SELECT id, nama, unit_kerja FROM anggota WHERE status_aktif=1 ORDER BY nama ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| Ok((r.get::<_, i64>(0)?, r.get::<_, String>(1)?, r.get::<_, String>(2)?)))
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows {
        let (id, nama, unit) = r.map_err(|e| e.to_string())?;
        // cari bulan2 yang sudah bayar tahun ini
        let mut p_stmt = conn
            .prepare("SELECT p.bulan FROM pembayaran_iuran pi JOIN periode_iuran p ON p.id=pi.periode_id WHERE pi.anggota_id=?1 AND p.tahun=?2")
            .map_err(|e| e.to_string())?;
        let bulan_rows = p_stmt
            .query_map(params![id, tahun], |row| row.get::<_, i32>(0))
            .map_err(|e| e.to_string())?;
        let mut paid = Vec::new();
        for b in bulan_rows {
            paid.push(b.map_err(|e| e.to_string())?);
        }
        out.push(serde_json::json!({ "id": id, "nama": nama, "unit_kerja": unit, "paid": paid }));
    }
    Ok(out)
}

#[tauri::command]
pub fn bayar_iuran_setahun(state: State<DbState>, input: crate::models::BayarSetahunInput) -> Result<serde_json::Value, String> {
    if input.tanggal_bayar.len() != 10 {
        return Err("Tanggal bayar harus YYYY-MM-DD".into());
    }
    if !["tunai", "transfer"].contains(&input.metode.as_str()) {
        return Err("Metode harus tunai/transfer".into());
    }
    if input.metode == "transfer" && input.bukti_transfer.as_deref().unwrap_or("").trim().is_empty() {
        return Err("Bukti transfer wajib untuk metode transfer".into());
    }
    if input.tahun < 2020 || input.tahun > 2100 {
        return Err("Tahun tidak valid".into());
    }
    let bulan_list: Vec<i32> = input.bulan_list.unwrap_or_else(|| (1..=12).collect());
    if bulan_list.is_empty() {
        return Err("Pilih minimal 1 bulan".into());
    }
    for b in &bulan_list {
        if !(1..=12).contains(b) {
            return Err(format!("Bulan {} tidak valid", b));
        }
    }
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    // cek anggota aktif
    let exists: i64 = conn
        .query_row("SELECT COUNT(*) FROM anggota WHERE id=?1 AND status_aktif=1", [input.anggota_id], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if exists == 0 {
        return Err("Anggota tidak ditemukan / nonaktif".into());
    }
    let anggota_nama: String = conn
        .query_row("SELECT nama FROM anggota WHERE id=?1", [input.anggota_id], |r| r.get(0))
        .map_err(|e| e.to_string())?;

    let mut created = 0;
    let mut skipped: Vec<i32> = Vec::new();
    let mut failed: Vec<String> = Vec::new();

    for bulan in bulan_list {
        // get_or_create periode
        conn.execute(
            "INSERT OR IGNORE INTO periode_iuran (bulan, tahun, nominal_wajib) VALUES (?1, ?2, 10000)",
            params![bulan, input.tahun],
        )
        .map_err(|e| e.to_string())?;
        let periode: crate::models::PeriodeIuran = {
            let mut stmt = conn
                .prepare("SELECT id, bulan, tahun, nominal_wajib, created_at FROM periode_iuran WHERE bulan=?1 AND tahun=?2")
                .map_err(|e| e.to_string())?;
            stmt.query_row(params![bulan, input.tahun], |r| {
                Ok(crate::models::PeriodeIuran {
                    id: r.get(0)?,
                    bulan: r.get(1)?,
                    tahun: r.get(2)?,
                    nominal_wajib: r.get(3)?,
                    created_at: r.get(4)?,
                })
            })
            .map_err(|e| e.to_string())?
        };
        // coba insert pembayaran
        let res = conn.execute(
            "INSERT INTO pembayaran_iuran (anggota_id, periode_id, tanggal_bayar, nominal, metode, keterangan, bukti_transfer) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![input.anggota_id, periode.id, input.tanggal_bayar, periode.nominal_wajib, input.metode, input.keterangan, input.bukti_transfer],
        );
        match res {
            Ok(_) => {
                let pid = conn.last_insert_rowid();
                let ket = format!("Iuran {}-{} - {}", periode.bulan, periode.tahun, anggota_nama);
                conn.execute(
                    "INSERT INTO kas_transaksi (tipe, kategori_id, nominal, tanggal, keterangan, referensi_pembayaran_id) VALUES ('masuk', 1, ?1, ?2, ?3, ?4)",
                    params![periode.nominal_wajib, input.tanggal_bayar, ket, pid],
                )
                .map_err(|e| e.to_string())?;
                created += 1;
            }
            Err(e) => {
                let msg = e.to_string();
                if msg.contains("UNIQUE") {
                    skipped.push(bulan);
                } else {
                    failed.push(format!("Bulan {}: {}", bulan, msg));
                }
            }
        }
    }
    if created == 0 && !skipped.is_empty() {
        return Err(format!("Semua bulan sudah lunas ({}). Tidak ada yang baru dibayar.", skipped.iter().map(|b| b.to_string()).collect::<Vec<_>>().join(", ")));
    }
    if !failed.is_empty() {
        return Err(failed.join("; "));
    }
    Ok(serde_json::json!({ "created": created, "skipped": skipped, "failed": failed }))
}
