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
  Shield,
  Settings,
  Tag,
  LogOut,
  Building2,
  Image as ImageIcon,
  Save,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useAuth, UserPublic } from "@/context/AuthContext";
import { open as dialogOpen } from "@tauri-apps/plugin-dialog";

export function Pengaturan() {
  const { user: currentUser, logout } = useAuth();
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
                      <TableCell className="text-right">
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
            Aplikasi Kas Forum PPPK &bull; Versi <strong>0.1.0</strong>
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
