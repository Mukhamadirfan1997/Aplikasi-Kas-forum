pub mod commands;
pub mod db;
pub mod models;

use db::{init_db, DbState};
use std::sync::Mutex;
use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let conn = init_db(app.handle()).expect("Gagal init database");
            app.manage(DbState(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::anggota::get_anggota,
            commands::anggota::add_anggota,
            commands::anggota::update_anggota,
            commands::anggota::delete_anggota,
            commands::anggota::get_saldo,
            commands::anggota::bulk_import_anggota,
            commands::auth::login,
            commands::auth::get_users,
            commands::auth::create_user,
            commands::auth::delete_user,
            commands::auth::change_password,
            commands::iuran::get_periode_list,
            commands::iuran::get_or_create_periode,
            commands::iuran::update_periode_nominal,
            commands::iuran::get_iuran_status,
            commands::iuran::bayar_iuran_bulk,
            commands::iuran::hapus_pembayaran,
            commands::iuran::get_checklist_matrix,
            commands::iuran::bayar_iuran_setahun,
            commands::kas::get_kategori_list,
            commands::kas::add_kategori,
            commands::kas::delete_kategori,
            commands::kas::get_kas_transaksi,
            commands::kas::add_kas_transaksi,
            commands::kas::delete_kas_transaksi,
            commands::kas::get_saldo_detail,
            commands::dashboard::get_dashboard_stats,
            commands::dashboard::get_tunggakan_list,
            commands::riwayat::tulis_riwayat,
            commands::riwayat::get_riwayat,
            commands::riwayat::hapus_riwayat_lama,
            commands::riwayat::hapus_semua_riwayat,
            commands::cadangan::buat_cadangan,
            commands::cadangan::pulihkan_cadangan,
            commands::cadangan::daftar_cadangan,
            commands::cadangan::info_cadangan,
            commands::profil::get_profil,
            commands::profil::update_profil
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
