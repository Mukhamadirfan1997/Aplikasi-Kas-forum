import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Plus,
  Trash2,
  Pencil,
  Shield,
  Settings,
  Tag,
  LogOut,
  Building2,
  Image as ImageIcon,
  Save,
  Wallet,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useAuth, UserPublic } from "@/context/AuthContext";
import { open as dialogOpen } from "@tauri-apps/plugin-dialog";
import { formatRupiah } from "@/lib/utils";

export function Pengaturan() {
  const { user: currentUser, logout, setUser } = useAuth();
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);
  void _error;

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nama: "",
    username: "",
    password: "",
    role: "bendahara",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserPublic | null>(null);
  const [editTarget, setEditTarget] = useState<UserPublic | null>(null);
  const [editForm, setEditForm] = useState({ nama: "", username: "", role: "viewer", password: "" });
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await invoke<UserPublic[]>("get_users");
      setUsers(data);
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "string"
            ? e
            : JSON.stringify(e);
      if (msg.includes("invoke")) {
        setUsers([
          {
            id: 1,
            nama: "Administrator",
            username: "admin",
            role: "admin",
            created_at: new Date().toISOString(),
          },
        ]);
      } else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.nama.trim() || !form.username.trim() || !form.password.trim()) {
      setFormError("Semua field wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      const created = await invoke<UserPublic>("create_user", {
        input: {
          nama: form.nama.trim(),
          username: form.username.trim(),
          password: form.password,
          role: form.role,
        },
      });
      setUsers((prev) => [...prev, created]);
      setOpen(false);
      setForm({ nama: "", username: "", password: "", role: "bendahara" });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : JSON.stringify(err);
      // jika bukan tauri, mock
      if (msg.includes("invoke")) {
        const mock: UserPublic = {
          id: Math.max(0, ...users.map((u) => u.id)) + 1,
          nama: form.nama.trim(),
          username: form.username.trim(),
          role: form.role,
          created_at: new Date().toISOString(),
        };
        setUsers((prev) => [...prev, mock]);
        setOpen(false);
        setForm({ nama: "", username: "", password: "", role: "bendahara" });
      } else setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await invoke<string>("delete_user", { id: deleteTarget.id });
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : JSON.stringify(err);
      if (msg.includes("invoke")) {
        setUsers((prev) => prev.filter((u) => u.id !== deleteTarget!.id));
        setDeleteTarget(null);
      } else {
        setError(msg);
        setDeleteTarget(null);
      }
    }
  };

  const openEdit = (u: UserPublic) => {
    setEditTarget(u);
    setEditForm({ nama: u.nama, username: u.username, role: u.role, password: "" });
    setEditError(null);
  };
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    if (!editForm.nama.trim() || !editForm.username.trim()) { setEditError("Nama dan username wajib diisi"); return; }
    if (editForm.username.trim().length < 3) { setEditError("Username minimal 3 karakter"); return; }
    if (editForm.password && editForm.password.length > 0 && editForm.password.length < 4) { setEditError("Password minimal 4 karakter (kosongkan jika tidak ganti)"); return; }
    setEditSubmitting(true); setEditError(null);
    try {
      const updated = await invoke<UserPublic>("update_user", {
        id: editTarget.id,
        input: {
          nama: editForm.nama.trim(),
          username: editForm.username.trim(),
          role: editForm.role,
          password: editForm.password.trim() ? editForm.password.trim() : null,
        },
      });
      setUsers((prev) => prev.map((x) => x.id === updated.id ? updated : x));
      if (currentUser?.id === updated.id) setUser(updated);
      setEditTarget(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err);
      if (msg.includes("invoke")) {
        const mock: UserPublic = { ...editTarget, nama: editForm.nama.trim(), username: editForm.username.trim(), role: editForm.role };
        setUsers((prev) => prev.map((x) => x.id === mock.id ? mock : x));
        if (currentUser?.id === mock.id) setUser(mock);
        setEditTarget(null);
      } else setEditError(msg);
    } finally { setEditSubmitting(false); }
  };

  const roleBadge = (role: string) => {
    if (role === "admin") return <Badge>admin</Badge>;
    if (role === "bendahara")
      return <Badge variant="secondary">bendahara</Badge>;
    return <Badge variant="outline">viewer</Badge>;
  };

  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
            <Settings className="h-6 w-6" /> Pengaturan
          </h2>
          <p className="text-sm text-white/80">
            Atur pengguna dan jenis keperluan
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={logout}
          className="bg-white/20 hover:bg-red-500/80 hover:text-white text-white border-0 gap-1.5 self-start sm:self-auto shadow-sm"
        >
          <LogOut className="h-4 w-4" /> Keluar dari Akun
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" /> Daftar Pengguna
          </CardTitle>
          <Button size="sm" onClick={() => setOpen(true)} disabled={!isAdmin}>
            <Plus className="h-4 w-4" /> Tambah Pengguna
          </Button>
        </CardHeader>
        <CardContent>
          {!isAdmin && (
            <p className="text-sm text-muted-foreground mb-3">
              Hanya admin yang bisa menambah/menghapus. Anda masuk sebagai{" "}
              {currentUser?.role}.
            </p>
          )}
          {loading ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat...
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Lengkap</TableHead>
                    <TableHead>Nama Pengguna</TableHead>
                    <TableHead>Jabatan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {u.nama}{" "}
                        {currentUser?.id === u.id && (
                          <span className="text-xs text-muted-foreground">
                            (Anda)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>@{u.username}</TableCell>
                      <TableCell>{roleBadge(u.role)}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!isAdmin && currentUser?.id !== u.id}
                          onClick={() => openEdit(u)}
                          title={isAdmin || currentUser?.id === u.id ? "Edit akun" : "Hanya admin / akun sendiri"}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          disabled={!isAdmin || users.length <= 1}
                          onClick={() => setDeleteTarget(u)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Awal masuk pakai{" "}
            <code className="bg-muted px-1 rounded">admin / admin123</code> —
            segera ganti kata sandi.
          </p>
        </CardContent>
      </Card>

      <ProfilForumSection isAdmin={isAdmin} />

      <KategoriSection isAdmin={isAdmin} />

      <SaldoAwalSection isAdmin={isAdmin} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            ⚙️ Bayar Rame-rame (Rapat)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Jika banyak anggota bayar bersamaan dalam 1 bulan (mis. saat rapat),
            aktifkan fitur ini. Jika mati, hanya tampil form per orang yang
            lebih sederhana.
          </p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={localStorage.getItem("kas_bulk_enabled") === "1"}
              onChange={(e) => {
                localStorage.setItem(
                  "kas_bulk_enabled",
                  e.target.checked ? "1" : "0",
                );
                window.dispatchEvent(new Event("kas_bulk_changed"));
              }}
              className="h-4 w-4"
            />
            <span className="text-sm font-medium">
              {localStorage.getItem("kas_bulk_enabled") === "1"
                ? "Aktif — tampil bayar rame-rame di Kas"
                : "Mati — hanya form per orang"}
            </span>
          </label>
          <p className="text-xs text-muted-foreground">
            Centang di sini, lalu buka <strong>Kas</strong> untuk melihat fitur
            bayar rame-rame.
          </p>
        </CardContent>
      </Card>

      <CadanganSection />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tentang Aplikasi</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1.5">
          <div>
            Aplikasi Kas Forum PPPK &bull; Versi <strong>1.0.0</strong>
          </div>
          <div>
            Pengembang: <strong className="text-slate-800">IrfanDev97</strong>
          </div>
          <div className="pt-1 text-xs">
            Data tersimpan 100% lokal di komputer (%APPDATA%). Sisa uang
            dihitung otomatis dari pemasukan dikurangi pengeluaran.
          </div>
          <div className="text-xs">
            Tips: Lakukan pencadangan data secara berkala (minimal 1× seminggu).
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Pengguna Baru</DialogTitle>
            <DialogDescription>
              Buat akun untuk pengurus. Pilih jabatan sesuai tugas.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Lengkap</Label>
              <Input
                value={form.nama}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nama: e.target.value }))
                }
                placeholder="Nama lengkap"
              />
            </div>
            <div className="space-y-2">
              <Label>Nama Pengguna</Label>
              <Input
                value={form.username}
                onChange={(e) =>
                  setForm((f) => ({ ...f, username: e.target.value }))
                }
                placeholder="tanpa spasi, mis. bendahara1"
              />
            </div>
            <div className="space-y-2">
              <Label>Kata Sandi</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                placeholder="minimal 4 huruf/angka"
              />
            </div>
            <div className="space-y-2">
              <Label>Jabatan</Label>
              <select
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({ ...f, role: e.target.value }))
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="admin">Admin (kelola semua)</option>
                <option value="bendahara">Bendahara (kelola kas)</option>
                <option value="viewer">Hanya Lihat</option>
              </select>
            </div>
            {formError && (
              <div className="text-sm text-destructive bg-destructive/10 border px-3 py-2 rounded-md">
                {formError}
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}{" "}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Akun — {editTarget?.username}</DialogTitle>
            <DialogDescription>Ubah nama, username, jabatan, dan kata sandi (kosongkan jika tidak ganti). Nama file export otomatis tetap bisa rename saat simpan.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Lengkap</Label>
              <Input value={editForm.nama} onChange={(e) => setEditForm((f) => ({ ...f, nama: e.target.value }))} placeholder="Nama lengkap" />
            </div>
            <div className="space-y-2">
              <Label>Nama Pengguna</Label>
              <Input value={editForm.username} onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))} placeholder="tanpa spasi, mis. bendahara1" />
            </div>
            <div className="space-y-2">
              <Label>Kata Sandi Baru (opsional)</Label>
              <Input type="password" value={editForm.password} onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))} placeholder="Kosongkan jika tidak ganti — min 4 karakter" />
            </div>
            <div className="space-y-2">
              <Label>Jabatan</Label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                disabled={!isAdmin}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm disabled:opacity-50"
              >
                <option value="admin">Admin (kelola semua)</option>
                <option value="bendahara">Bendahara (kelola kas)</option>
                <option value="viewer">Hanya Lihat</option>
              </select>
              {!isAdmin && <p className="text-xs text-muted-foreground">Hanya admin yang bisa ubah jabatan.</p>}
            </div>
            {editError && <div className="text-sm text-destructive bg-destructive/10 border px-3 py-2 rounded-md">{editError}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)} disabled={editSubmitting}>Batal</Button>
              <Button type="submit" disabled={editSubmitting}>{editSubmitting && <Loader2 className="h-4 w-4 animate-spin" />} Simpan Perubahan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Pengguna?</DialogTitle>
            <DialogDescription>
              Yakin hapus <strong>{deleteTarget?.nama}</strong> (@
              {deleteTarget?.username})? Tidak bisa dikembalikan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CadanganSection() {
  const [info, setInfo] = useState<{
    path: string;
    size: number;
    modified: string;
    backup_count: number;
    backup_dir: string;
  } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    try {
      const r = await invoke<{
        path: string;
        size: number;
        modified: string;
        backup_count: number;
        backup_dir: string;
      }>("info_cadangan");
      setInfo(r);
    } catch (e: unknown) {
      const m = String(e);
      if (m.includes("invoke"))
        setInfo({
          path: "C:\\contoh\\kas.db",
          size: 24576,
          modified: new Date().toLocaleString("id-ID"),
          backup_count: 2,
          backup_dir: "C:\\contoh\\backup",
        });
    }
  };
  useEffect(() => {
    load();
  }, []);
  const buat = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const p = await invoke<string>("buat_cadangan");
      setMsg(`Cadangan berhasil: ${p}`);
      load();
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      if (m.includes("invoke"))
        setMsg("(Contoh) Cadangan dibuat di Dokumen/kas-2026-09-18.db");
      else setMsg(m);
    } finally {
      setLoading(false);
    }
  };
  const pulihkan = async () => {
    let filePath: string | null = null;
    try {
      // Native file picker (hanya di Tauri)
      const selected = await dialogOpen({
        title: "Pilih File Cadangan Database",
        filters: [{ name: "SQLite Database", extensions: ["db"] }],
        multiple: false,
        directory: false,
      });
      if (!selected) return;
      filePath = typeof selected === "string" ? selected : selected;
    } catch (_dialogErr) {
      // fallback ke prompt jika bukan Tauri (browser dev)
      filePath = prompt(
        "Masukkan lokasi file cadangan (.db)\nContoh: D:\\Backup\\kas-2026-09-18.db",
      );
    }
    if (!filePath) return;
    if (
      !confirm(
        `Yakin pulihkan dari:\n${filePath}\n\nData sekarang akan terganti!`,
      )
    )
      return;
    if (prompt("Ketik PULIHKAN untuk konfirmasi") !== "PULIHKAN") return;
    setLoading(true);
    try {
      const p = await invoke<string>("pulihkan_cadangan", { filePath });
      setMsg(
        `✅ Dipulihkan ke: ${p}. Silakan muat ulang aplikasi (tutup & buka kembali).`,
      );
      load();
    } catch (e: unknown) {
      setMsg(`❌ ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          💾 Cadangan Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {info && (
          <div className="text-sm bg-muted p-2 rounded-md space-y-1">
            <div>
              File utama: <code className="text-xs">{info.path}</code>
            </div>
            <div>
              Ukuran: {(info.size / 1024).toFixed(1)} KB — Diubah:{" "}
              {info.modified}
            </div>
            <div>
              Jumlah cadangan: {info.backup_count} — Folder:{" "}
              <code className="text-xs">{info.backup_dir}</code>
            </div>
          </div>
        )}
        {msg && (
          <div className="text-sm border px-2 py-1 rounded bg-amber-50">
            {msg}
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={buat} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Buat
            Cadangan Sekarang
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={pulihkan}
            disabled={loading}
          >
            Pulihkan dari File
          </Button>
          <Button size="sm" variant="outline" onClick={load}>
            Muat Ulang Info
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Cadangan adalah salinan file kas.db (kecil, &lt;5MB). Simpan di
          Dokumen atau flashdisk. Riwayat 6 bulan terakhir juga ikut
          tercadangkan.
        </p>
      </CardContent>
    </Card>
  );
}

type ProfilData = {
  id: number;
  nama_forum: string;
  alamat: string | null;
  deskripsi: string | null;
  ketua_nama: string | null;
  ketua_nip: string | null;
  sekretaris_nama: string | null;
  sekretaris_nip: string | null;
  bendahara_nama: string | null;
  bendahara_nip: string | null;
  logo_base64: string | null;
  nominal_default: number;
  updated_at: string;
};

function ProfilForumSection({ isAdmin }: { isAdmin: boolean }) {
  const [profil, setProfil] = useState<ProfilData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    nama_forum: "",
    alamat: "",
    deskripsi: "",
    ketua_nama: "",
    ketua_nip: "",
    sekretaris_nama: "",
    sekretaris_nip: "",
    bendahara_nama: "",
    bendahara_nip: "",
    logo_base64: "" as string | null,
    nominal_default: "10000",
  });

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const p = await invoke<ProfilData>("get_profil");
      setProfil(p);
      setForm({
        nama_forum: p.nama_forum || "",
        alamat: p.alamat || "",
        deskripsi: p.deskripsi || "",
        ketua_nama: p.ketua_nama || "",
        ketua_nip: p.ketua_nip || "",
        sekretaris_nama: p.sekretaris_nama || "",
        sekretaris_nip: p.sekretaris_nip || "",
        bendahara_nama: p.bendahara_nama || "",
        bendahara_nip: p.bendahara_nip || "",
        logo_base64: p.logo_base64 || null,
        nominal_default: String(p.nominal_default || 10000),
      });
    } catch (e: unknown) {
      const m = String(e);
      if (m.includes("invoke")) {
        const mock: ProfilData = {
          id: 1,
          nama_forum: "Forum PPPK",
          alamat: "Kec. Rejoso, Kab. Nganjuk",
          deskripsi: "",
          ketua_nama: "",
          ketua_nip: "",
          sekretaris_nama: "",
          sekretaris_nip: "",
          bendahara_nama: "",
          bendahara_nip: "",
          logo_base64: null,
          nominal_default: 10000,
          updated_at: new Date().toISOString(),
        };
        setProfil(mock);
        setForm({
          nama_forum: mock.nama_forum,
          alamat: mock.alamat || "",
          deskripsi: "",
          ketua_nama: "",
          ketua_nip: "",
          sekretaris_nama: "",
          sekretaris_nip: "",
          bendahara_nama: "",
          bendahara_nip: "",
          logo_base64: null,
          nominal_default: String(mock.nominal_default),
        });
      } else setErr(m);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      setErr("Logo maksimal 500KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, logo_base64: reader.result as string }));
      setErr(null);
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!form.nama_forum.trim()) {
      setErr("Nama forum wajib diisi");
      return;
    }
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      const nominalNum = parseInt(form.nominal_default);
      if (!nominalNum || nominalNum <= 0) { setErr("Nominal default harus > 0"); setSaving(false); return; }
      const updated = await invoke<ProfilData>("update_profil", {
        input: {
          nama_forum: form.nama_forum.trim(),
          alamat: form.alamat.trim() || null,
          deskripsi: form.deskripsi.trim() || null,
          ketua_nama: form.ketua_nama.trim() || null,
          ketua_nip: form.ketua_nip.trim() || null,
          sekretaris_nama: form.sekretaris_nama.trim() || null,
          sekretaris_nip: form.sekretaris_nip.trim() || null,
          bendahara_nama: form.bendahara_nama.trim() || null,
          bendahara_nip: form.bendahara_nip.trim() || null,
          logo_base64: form.logo_base64 || null,
          nominal_default: nominalNum,
        },
      });
      setProfil(updated);
      setMsg("Profil berhasil disimpan");
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      if (m.includes("invoke")) {
        setProfil((prev) =>
          prev
            ? {
                ...prev,
                nama_forum: form.nama_forum.trim(),
                alamat: form.alamat,
                deskripsi: form.deskripsi,
                ketua_nama: form.ketua_nama,
                ketua_nip: form.ketua_nip,
                sekretaris_nama: form.sekretaris_nama,
                sekretaris_nip: form.sekretaris_nip,
                bendahara_nama: form.bendahara_nama,
                bendahara_nip: form.bendahara_nip,
                logo_base64: form.logo_base64,
                nominal_default: parseInt(form.nominal_default) || 10000,
              }
            : prev,
        );
        setMsg("(Pratinjau) Profil disimpan (mock)");
      } else setErr(m);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat profil...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" /> Profil Forum
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Nama forum & pengurus akan tampil di cetak Daftar Lunas dan Laporan
          (kop & tanda tangan). Logo opsional.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {err && (
          <div className="text-sm text-destructive bg-destructive/10 border px-3 py-2 rounded-md">
            {err}
          </div>
        )}
        {msg && (
          <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-md">
            {msg}
          </div>
        )}
        {!isAdmin && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-md">
            Hanya admin yang bisa mengubah profil. Anda masuk sebagai
            viewer/bendahara (hanya lihat).
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Nama Forum *</Label>
            <Input
              value={form.nama_forum}
              onChange={(e) =>
                setForm((f) => ({ ...f, nama_forum: e.target.value }))
              }
              placeholder="Forum PPPK"
              disabled={!isAdmin}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Alamat</Label>
            <Input
              value={form.alamat}
              onChange={(e) =>
                setForm((f) => ({ ...f, alamat: e.target.value }))
              }
              placeholder="Kec. Rejoso, Kab. Nganjuk"
              disabled={!isAdmin}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Deskripsi (opsional)</Label>
          <Textarea
            value={form.deskripsi}
            onChange={(e) =>
              setForm((f) => ({ ...f, deskripsi: e.target.value }))
            }
            placeholder="Forum PPPK Kabupaten ... — deskripsi singkat"
            rows={2}
            disabled={!isAdmin}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
            <div className="text-sm font-semibold">Ketua</div>
            <div className="space-y-1.5">
              <Label>Nama Ketua</Label>
              <Input
                value={form.ketua_nama}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ketua_nama: e.target.value }))
                }
                placeholder="Nama ketua"
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-1.5">
              <Label>NIP Ketua</Label>
              <Input
                value={form.ketua_nip}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ketua_nip: e.target.value }))
                }
                placeholder="NIP / NUPTK"
                disabled={!isAdmin}
              />
            </div>
          </div>
          <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
            <div className="text-sm font-semibold">Sekretaris</div>
            <div className="space-y-1.5">
              <Label>Nama Sekretaris</Label>
              <Input
                value={form.sekretaris_nama}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sekretaris_nama: e.target.value }))
                }
                placeholder="Nama sekretaris"
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-1.5">
              <Label>NIP Sekretaris</Label>
              <Input
                value={form.sekretaris_nip}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sekretaris_nip: e.target.value }))
                }
                placeholder="NIP / NUPTK"
                disabled={!isAdmin}
              />
            </div>
          </div>
          <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
            <div className="text-sm font-semibold">Bendahara</div>
            <div className="space-y-1.5">
              <Label>Nama Bendahara</Label>
              <Input
                value={form.bendahara_nama}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bendahara_nama: e.target.value }))
                }
                placeholder="Nama bendahara"
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-1.5">
              <Label>NIP Bendahara</Label>
              <Input
                value={form.bendahara_nip}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bendahara_nip: e.target.value }))
                }
                placeholder="NIP / NUPTK"
                disabled={!isAdmin}
              />
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" /> Logo Forum (opsional, maks
            500KB)
          </Label>
          <div className="flex items-center gap-3 flex-wrap">
            {form.logo_base64 ? (
              <img
                src={form.logo_base64}
                alt="logo preview"
                className="h-16 w-16 object-contain border rounded bg-white p-1"
              />
            ) : (
              <div className="h-16 w-16 border rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                Tanpa logo
              </div>
            )}
            {isAdmin && (
              <>
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogo}
                  className="max-w-[260px]"
                />
                {form.logo_base64 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm((f) => ({ ...f, logo_base64: null }))
                    }
                  >
                    Hapus Logo
                  </Button>
                )}
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Gunakan PNG/JPG transparan. Jika kosong, cetak tetap rapi tanpa
            logo.
          </p>
        </div>
        <div className="space-y-1.5 border rounded-lg p-3 bg-muted/20">
          <Label className="flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5" /> Nominal Iuran Default (per bulan)
          </Label>
          <div className="flex gap-2 items-center">
            <Input
              type="number"
              value={form.nominal_default}
              onChange={(e) => setForm((f) => ({ ...f, nominal_default: e.target.value }))}
              placeholder="10000"
              disabled={!isAdmin}
              className="max-w-[180px]"
            />
            <span className="text-sm text-muted-foreground">Rp</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Jika diubah 10.000 → 20.000, periode <strong>baru</strong> otomatis 20.000. Periode lama yang sudah dibayar tetap 10.000 (tidak retroaktif). Ubah tiap periode via menu Iuran → <em>Simpan Jumlah Baru</em>.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={save} disabled={!isAdmin || saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}{" "}
            <Save className="h-4 w-4" /> Simpan Profil
          </Button>
          <Button variant="outline" onClick={load} disabled={saving}>
            Muat Ulang
          </Button>
        </div>
        {profil && (
          <p className="text-xs text-muted-foreground">
            Terakhir diperbarui:{" "}
            {new Date(profil.updated_at).toLocaleString("id-ID")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function KategoriSection({ isAdmin }: { isAdmin: boolean }) {
  const [list, setList] = useState<
    { id: number; nama: string; tipe: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [nama, setNama] = useState("");
  const [tipe, setTipe] = useState<"masuk" | "keluar">("keluar");
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const k =
        await invoke<{ id: number; nama: string; tipe: string }[]>(
          "get_kategori_list",
        );
      setList(k);
    } catch {
      setList([
        { id: 1, nama: "Iuran Anggota", tipe: "masuk" },
        { id: 2, nama: "Konsumsi", tipe: "keluar" },
      ]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!nama.trim()) return setMsg("Nama kategori wajib");
    try {
      const k = await invoke<{ id: number; nama: string; tipe: string }>(
        "add_kategori",
        { nama: nama.trim(), tipe },
      );
      setList((p) => [...p, k]);
      setNama("");
      setMsg(null);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };
  const del = async (id: number) => {
    if (!confirm("Hapus kategori ini?")) return;
    try {
      await invoke("delete_kategori", { id });
      setList((p) => p.filter((x) => x.id !== id));
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Tag className="h-4 w-4" /> Jenis Keperluan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {msg && (
          <div className="text-sm text-destructive bg-destructive/10 border px-2 py-1 rounded">
            {msg}
          </div>
        )}
        {loading ? (
          <div className="text-sm text-muted-foreground">Memuat...</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {list.map((k) => (
              <span
                key={k.id}
                className="inline-flex items-center gap-1 border rounded-full px-3 py-1 text-sm"
              >
                {k.nama}{" "}
                <Badge
                  variant={k.tipe === "masuk" ? "default" : "secondary"}
                  className="ml-1 text-xs"
                >
                  {k.tipe}
                </Badge>
                {isAdmin && (
                  <button
                    onClick={() => del(k.id)}
                    className="ml-1 text-destructive hover:underline text-xs"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
        {isAdmin ? (
          <div className="flex gap-2">
            <Input
              placeholder="Nama keperluan baru, mis. Transport"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="flex-1"
            />
            <select
              value={tipe}
              onChange={(e) => setTipe(e.target.value as any)}
              className="border rounded-md px-2 text-sm"
            >
              <option value="keluar">Uang Keluar</option>
              <option value="masuk">Uang Masuk</option>
            </select>
            <Button size="sm" onClick={add}>
              <Plus className="h-4 w-4" /> Tambah
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Hanya admin yang bisa menambah jenis keperluan.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SaldoAwalSection({ isAdmin }: { isAdmin: boolean }) {
  const [kategoriId, setKategoriId] = useState<number | null>(null);
  const [list, setList] = useState<{ id: number; tanggal: string; nominal: number; keterangan: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [nominal, setNominal] = useState("");
  const [ket, setKet] = useState("Saldo awal pembukuan manual");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true); setErr(null);
    try {
      const k = await invoke<{ id: number; nama: string; tipe: string }[]>("get_kategori_list");
      let id = k.find((x) => x.nama.toLowerCase() === "saldo awal")?.id ?? null;
      if (!id) {
        try { const created = await invoke<{ id: number }>("add_kategori", { nama: "Saldo Awal", tipe: "masuk" }); id = created.id; } catch {}
      }
      setKategoriId(id);
      if (id) {
        const data = await invoke<{ id: number; tanggal: string; nominal: number; keterangan: string }[]>("get_kas_transaksi", { tipe: "masuk", kategoriId: id, dari: null, sampai: null, limit: 100 } as any);
        setList(data);
      }
    } catch (e: unknown) {
      const m = String(e);
      if (m.includes("invoke")) {
        setKategoriId(6);
        setList([]);
      } else setErr(m);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!kategoriId) return setErr("Kategori Saldo Awal belum siap");
    const n = parseInt(nominal);
    if (!n || n <= 0) return setErr("Nominal harus > 0");
    if (!tanggal) return setErr("Tanggal wajib diisi");
    if (!ket.trim()) return setErr("Keterangan wajib diisi");
    setSaving(true); setErr(null); setMsg(null);
    try {
      await invoke("add_kas_transaksi", { input: { tipe: "masuk", kategori_id: kategoriId, nominal: n, tanggal, keterangan: ket.trim(), bukti: null, penanggung_jawab: null } });
      setMsg(`Saldo awal ${formatRupiah(n)} pada ${tanggal} berhasil disimpan. Saldo Dashboard langsung bertambah.`);
      setNominal(""); load();
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      if (m.includes("invoke")) { setList((prev) => [...prev, { id: Date.now(), tanggal, nominal: n, keterangan: ket.trim() }]); setMsg("(Pratinjau) Saldo awal dicatat"); setNominal(""); }
      else setErr(m);
    } finally { setSaving(false); }
  };
  const del = async (id: number) => {
    if (!confirm("Hapus saldo awal ini? Saldo akan berkurang.")) return;
    try { await invoke("delete_kas_transaksi", { id }); setList((p) => p.filter((x) => x.id !== id)); setMsg("Saldo awal dihapus"); } catch (e: unknown) {
      const m = String(e);
      if (m.includes("invoke")) setList((p) => p.filter((x) => x.id !== id));
      else setErr(m);
    }
  };
  const total = list.reduce((a, b) => a + b.nominal, 0);
  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">💰 Saldo Awal (Sisa Pembukuan Manual Tahun Lalu)</CardTitle>
        <p className="text-xs text-muted-foreground">Masukkan sisa kas dari buku manual (mis. 31-Des-2024). Masuk sebagai kas masuk kategori Saldo Awal — langsung menambah saldo Dashboard & Laporan tanpa mengganggu iuran.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {err && <div className="text-sm text-destructive bg-destructive/10 border px-3 py-2 rounded-md">{err}</div>}
        {msg && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-md">{msg}</div>}
        {!isAdmin && <p className="text-xs text-amber-700 bg-amber-50 border px-2 py-1 rounded">Hanya admin yang bisa tambah/hapus saldo awal.</p>}
        <div className="text-sm bg-white border rounded-md p-2">Total Saldo Awal tersimpan: <strong>{formatRupiah(total)}</strong> {list.length > 0 ? `(${list.length} entri)` : "(belum ada — dashboard mulai dari 0)"}</div>
        {isAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
            <div className="space-y-1"><Label>Tanggal</Label><Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} /></div>
            <div className="space-y-1"><Label>Nominal (Rp)</Label><Input type="number" value={nominal} onChange={(e) => setNominal(e.target.value)} placeholder="mis. 1500000" /></div>
            <div className="space-y-1 sm:col-span-2"><Label>Keterangan</Label><Input value={ket} onChange={(e) => setKet(e.target.value)} placeholder="Saldo awal 31-Des-2024" /></div>
            <div className="sm:col-span-4 flex gap-2">
              <Button size="sm" onClick={add} disabled={saving || !isAdmin}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Simpan Saldo Awal</Button>
              <Button size="sm" variant="outline" onClick={load}>Muat Ulang</Button>
            </div>
            {nominal && <div className="text-xs text-muted-foreground sm:col-span-4">{formatRupiah(parseInt(nominal) || 0)}</div>}
          </div>
        )}
        {loading ? <div className="text-sm text-muted-foreground flex gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Memuat...</div> : list.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada entri saldo awal. Jika ada sisa buku manual tahun lalu, masukkan di atas — contoh: 31-Des-2024, 1.500.000, keterangan &quot;Sisa buku manual 2024&quot;.</p> : (
          <div className="rounded-md border overflow-hidden bg-white">
            <Table>
              <TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Keterangan</TableHead><TableHead className="text-right">Nominal</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
              <TableBody>{list.map((r) => (<TableRow key={r.id}><TableCell className="text-xs">{r.tanggal}</TableCell><TableCell className="text-sm">{r.keterangan}</TableCell><TableCell className="text-right font-medium text-emerald-600">{formatRupiah(r.nominal)}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" className="text-destructive" disabled={!isAdmin} onClick={() => del(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell></TableRow>))}</TableBody>
            </Table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">Skenario: sisa manual 2024 Rp 1.500.000 → isi 2024-12-31, 1500000, keterangan &quot;Saldo awal 2024&quot; → Simpan → Dashboard Saldo langsung +1,5jt. Laporan filter Dari 2024-12-31 akan ikut. Jika nominal iuran berubah 10k→20k, saldo awal tidak terpengaruh.</p>
      </CardContent>
    </Card>
  );
}
