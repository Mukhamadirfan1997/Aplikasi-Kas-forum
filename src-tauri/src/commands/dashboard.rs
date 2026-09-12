use crate::db::DbState;
use serde_json::json;
use tauri::State;

#[tauri::command]
pub fn get_dashboard_stats(state: State<DbState>) -> Result<serde_json::Value, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let masuk: i64 = conn
        .query_row("SELECT COALESCE(SUM(nominal),0) FROM kas_transaksi WHERE tipe='masuk'", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    let keluar: i64 = conn
        .query_row("SELECT COALESCE(SUM(nominal),0) FROM kas_transaksi WHERE tipe='keluar'", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    let saldo = masuk - keluar;

    let ym = chrono::Local::now().format("%Y-%m").to_string();
    let masuk_bulan: i64 = conn
        .query_row("SELECT COALESCE(SUM(nominal),0) FROM kas_transaksi WHERE tipe='masuk' AND substr(tanggal,1,7)=?1", [&ym], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    let keluar_bulan: i64 = conn
        .query_row("SELECT COALESCE(SUM(nominal),0) FROM kas_transaksi WHERE tipe='keluar' AND substr(tanggal,1,7)=?1", [&ym], |r| r.get(0))
        .map_err(|e| e.to_string())?;

    let anggota_aktif: i64 = conn
        .query_row("SELECT COUNT(*) FROM anggota WHERE status_aktif=1", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;

    // tunggakan bulan ini: anggota aktif - sudah bayar periode bulan ini
    let now = chrono::Local::now();
    let bulan = now.format("%m").to_string().parse::<i32>().unwrap_or(1);
    let tahun = now.format("%Y").to_string().parse::<i32>().unwrap_or(2026);
    let periode_id: Option<i64> = conn
        .query_row("SELECT id FROM periode_iuran WHERE bulan=?1 AND tahun=?2", rusqlite::params![bulan, tahun], |r| r.get(0))
        .ok();
    let belum_bayar: i64 = if let Some(pid) = periode_id {
        let sudah: i64 = conn
            .query_row("SELECT COUNT(*) FROM pembayaran_iuran WHERE periode_id=?1", [pid], |r| r.get(0))
            .map_err(|e| e.to_string())?;
        (anggota_aktif - sudah).max(0)
    } else {
        anggota_aktif // jika periode belum dibuat, semua dianggap belum
    };

    // tren 12 bulan terakhir (termasuk bulan ini)
    let mut tren = Vec::new();
    for i in (0..12).rev() {
        let d = now - chrono::Duration::days(30 * i as i64); // approx, tapi kita pakai YYYY-MM dari chrono
        // lebih akurat: hitung bulan/tahun via chrono
        let dt = chrono::NaiveDate::from_ymd_opt(tahun, bulan as u32, 1)
            .unwrap_or(chrono::NaiveDate::from_ymd_opt(2026, 1, 1).unwrap())
            - chrono::Duration::days(0);
        // hitung offset bulan
        let mut y = tahun;
        let mut m = bulan - i;
        while m <= 0 {
            m += 12;
            y -= 1;
        }
        let ym_key = format!("{:04}-{:02}", y, m);
        let masuk_m: i64 = conn
            .query_row("SELECT COALESCE(SUM(nominal),0) FROM kas_transaksi WHERE tipe='masuk' AND substr(tanggal,1,7)=?1", [&ym_key], |r| r.get(0))
            .map_err(|e| e.to_string())?;
        let keluar_m: i64 = conn
            .query_row("SELECT COALESCE(SUM(nominal),0) FROM kas_transaksi WHERE tipe='keluar' AND substr(tanggal,1,7)=?1", [&ym_key], |r| r.get(0))
            .map_err(|e| e.to_string())?;
        tren.push(json!({ "bulan": ym_key, "masuk": masuk_m, "keluar": keluar_m, "saldo": masuk_m - keluar_m }));
        let _ = d;
        let _ = dt;
    }

    Ok(json!({
        "saldo": saldo,
        "total_masuk": masuk,
        "total_keluar": keluar,
        "masuk_bulan": masuk_bulan,
        "keluar_bulan": keluar_bulan,
        "anggota_aktif": anggota_aktif,
        "belum_bayar": belum_bayar,
        "tren": tren,
    }))
}

#[tauri::command]
pub fn get_tunggakan_list(state: State<DbState>) -> Result<Vec<serde_json::Value>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let now = chrono::Local::now();
    let bulan: i32 = now.format("%m").to_string().parse().unwrap_or(1);
    let tahun: i32 = now.format("%Y").to_string().parse().unwrap_or(2026);
    let periode_id: Option<i64> = conn
        .query_row("SELECT id FROM periode_iuran WHERE bulan=?1 AND tahun=?2", rusqlite::params![bulan, tahun], |r| r.get(0))
        .ok();
    if periode_id.is_none() {
        // semua anggota aktif adalah tunggakan
        let mut stmt = conn.prepare("SELECT id, nama, unit_kerja FROM anggota WHERE status_aktif=1 ORDER BY nama").map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |r| Ok(json!({ "id": r.get::<_, i64>(0)?, "nama": r.get::<_, String>(1)?, "unit_kerja": r.get::<_, String>(2)? }))).map_err(|e| e.to_string())?;
        let mut out = Vec::new();
        for r in rows { out.push(r.map_err(|e| e.to_string())?); }
        return Ok(out);
    }
    let pid = periode_id.unwrap();
    let mut stmt = conn.prepare(
        "SELECT a.id, a.nama, a.unit_kerja FROM anggota a WHERE a.status_aktif=1 AND NOT EXISTS (SELECT 1 FROM pembayaran_iuran p WHERE p.anggota_id=a.id AND p.periode_id=?1) ORDER BY a.nama"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([pid], |r| Ok(json!({ "id": r.get::<_, i64>(0)?, "nama": r.get::<_, String>(1)?, "unit_kerja": r.get::<_, String>(2)? }))).map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}
