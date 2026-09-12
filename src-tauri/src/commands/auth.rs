use crate::db::DbState;
use crate::models::{UserInput, UserPublic};
use rusqlite::params;
use tauri::State;

fn row_to_user(row: &rusqlite::Row) -> rusqlite::Result<UserPublic> {
    Ok(UserPublic {
        id: row.get(0)?,
        nama: row.get(1)?,
        username: row.get(2)?,
        role: row.get(3)?,
        created_at: row.get(4)?,
    })
}

#[tauri::command]
pub fn login(state: State<DbState>, username: String, password: String) -> Result<UserPublic, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let username = username.trim().to_string();
    if username.is_empty() || password.is_empty() {
        return Err("Username dan password wajib diisi".into());
    }
    let mut stmt = conn
        .prepare("SELECT id, nama, username, role, created_at, password_hash FROM users WHERE username = ?1")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query([username.clone()]).map_err(|e| e.to_string())?;
    let row = rows.next().map_err(|e| e.to_string())?;
    let (user, hash): (UserPublic, String) = match row {
        Some(r) => {
            let u = UserPublic {
                id: r.get(0).map_err(|e| e.to_string())?,
                nama: r.get(1).map_err(|e| e.to_string())?,
                username: r.get(2).map_err(|e| e.to_string())?,
                role: r.get(3).map_err(|e| e.to_string())?,
                created_at: r.get(4).map_err(|e| e.to_string())?,
            };
            let h: String = r.get(5).map_err(|e| e.to_string())?;
            (u, h)
        }
        None => return Err("Username tidak ditemukan".into()),
    };
    let valid = bcrypt::verify(&password, &hash).map_err(|e| e.to_string())?;
    if !valid {
        return Err("Password salah".into());
    }
    Ok(user)
}

#[tauri::command]
pub fn get_users(state: State<DbState>) -> Result<Vec<UserPublic>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, nama, username, role, created_at FROM users ORDER BY id ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], row_to_user).map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

#[tauri::command]
pub fn create_user(state: State<DbState>, input: UserInput) -> Result<UserPublic, String> {
    let nama = input.nama.trim().to_string();
    let username = input.username.trim().to_string();
    let password = input.password.trim().to_string();
    let role = input.role.trim().to_string();

    if nama.is_empty() {
        return Err("Nama wajib diisi".into());
    }
    if username.len() < 3 {
        return Err("Username minimal 3 karakter".into());
    }
    if password.len() < 4 {
        return Err("Password minimal 4 karakter".into());
    }
    if !["admin", "bendahara", "viewer"].contains(&role.as_str()) {
        return Err("Role harus admin / bendahara / viewer".into());
    }
    let hash = bcrypt::hash(&password, 10).map_err(|e| e.to_string())?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let res = conn.execute(
        "INSERT INTO users (nama, username, password_hash, role) VALUES (?1, ?2, ?3, ?4)",
        params![nama, username, hash, role],
    );
    if let Err(e) = res {
        let msg = e.to_string();
        if msg.contains("UNIQUE") {
            return Err("Username sudah dipakai".into());
        }
        return Err(msg);
    }
    let id = conn.last_insert_rowid();
    let mut stmt = conn
        .prepare("SELECT id, nama, username, role, created_at FROM users WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    let user = stmt.query_row([id], row_to_user).map_err(|e| e.to_string())?;
    Ok(user)
}

#[tauri::command]
pub fn delete_user(state: State<DbState>, id: i64) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if count <= 1 {
        return Err("Tidak bisa hapus: minimal harus ada 1 user".into());
    }
    let affected = conn.execute("DELETE FROM users WHERE id = ?1", [id]).map_err(|e| e.to_string())?;
    if affected == 0 {
        return Err("User tidak ditemukan".into());
    }
    Ok("User dihapus".into())
}

#[tauri::command]
pub fn change_password(state: State<DbState>, id: i64, old_password: String, new_password: String) -> Result<String, String> {
    if new_password.trim().len() < 4 {
        return Err("Password baru minimal 4 karakter".into());
    }
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let hash: String = conn
        .query_row("SELECT password_hash FROM users WHERE id = ?1", [id], |r| r.get(0))
        .map_err(|_| "User tidak ditemukan".to_string())?;
    let valid = bcrypt::verify(&old_password, &hash).map_err(|e| e.to_string())?;
    if !valid {
        return Err("Password lama salah".into());
    }
    let new_hash = bcrypt::hash(new_password.trim(), 10).map_err(|e| e.to_string())?;
    conn.execute("UPDATE users SET password_hash = ?1 WHERE id = ?2", params![new_hash, id])
        .map_err(|e| e.to_string())?;
    Ok("Password berhasil diubah".into())
}
