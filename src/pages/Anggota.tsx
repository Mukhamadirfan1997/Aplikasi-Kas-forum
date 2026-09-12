import { useEffect, useState, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, Pencil, UserX, Users, Loader2, RefreshCw, Upload, Download } from "lucide-react";
import { PaginationControls } from "@/components/ui/pagination-controls";
import * as XLSX from "xlsx";
import { saveXlsx } from "@/lib/fileSave";

type Anggota = {
  id: number;
  nama: string;
  nip_nuptk: string | null;
  unit_kerja: string;
  no_hp: string | null;
  status_aktif: boolean;
  created_at: string;
  updated_at: string;
};

type AnggotaInput = {
  nama: string;
  nip_nuptk: string | null;
  unit_kerja: string;
  no_hp: string | null;
  status_aktif: boolean;
};

const emptyForm: AnggotaInput = {
  nama: "",
  unit_kerja: "",
  nip_nuptk: null,
  no_hp: null,
  status_aktif: true,
};

export function Anggota() {
  const [data, setData] = useState<Anggota[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "aktif" | "nonaktif">("all");
  const [error, setError] = useState<string | null>(null);
  const [isTauri, setIsTauri] = useState(true);

  // dialog state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Anggota | null>(null);
  const [form, setForm] = useState<AnggotaInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Anggota | null>(null);
  // impor
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<{ nama: string; nip_nuptk: string; unit_kerja: string; no_hp: string }[]>([]);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ sukses: number; gagal: { baris: number; alasan: string }[] } | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  const fetchData = async (s: string, status: typeof statusFilter) => {
    setLoading(true);
    setError(null);
    try {
      const statusAktif = status === "all" ? null : status === "aktif";
      // Tauri invoke: param names are snake_case but JS uses camel? Rust expects status_aktif
      // Tauri maps JS object keys directly, so use status_aktif
      const result = await invoke<Anggota[]>("get_anggota", {
        search: s || null,
        statusAktif: statusAktif,
      } as unknown as Record<string, unknown>);
      setData(result);
      setIsTauri(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : JSON.stringify(e);
      // fallback for vite dev tanpa tauri
      if (msg.includes("not allowed") || msg.includes("not found") || msg.includes("invoke")) {
        setIsTauri(false);
        // mock data untuk preview dev
        setData((prev) =>
          prev.length > 0
            ? prev
            : [
                {
                  id: 1,
                  nama: "Budi Santoso",
                  nip_nuptk: "198001012010011001",
                  unit_kerja: "SDN 1 Rejoso",
                  no_hp: "08123456789",
                  status_aktif: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                {
                  id: 2,
                  nama: "Siti Aminah",
                  nip_nuptk: null,
                  unit_kerja: "SDN 2 Rejoso",
                  no_hp: null,
                  status_aktif: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                {
                  id: 3,
                  nama: "Ahmad Fauzi",
                  nip_nuptk: "198505052009021003",
                  unit_kerja: "SDN 3 Rejoso",
                  no_hp: "082112334455",
                  status_aktif: false,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
              ]
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData("", "all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => fetchData(search, statusFilter), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  const filteredCount = useMemo(() => data.length, [data]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  useEffect(() => { setPage(1); }, [search, statusFilter, data.length, pageSize]);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const pagedData = useMemo(() => data.slice((page - 1) * pageSize, page * pageSize), [data, page, pageSize]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setOpen(true);
  };
  const openEdit = (a: Anggota) => {
    setEditing(a);
    setForm({
      nama: a.nama,
      unit_kerja: a.unit_kerja,
      nip_nuptk: a.nip_nuptk,
      no_hp: a.no_hp,
      status_aktif: a.status_aktif,
    });
    setFormError(null);
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) return setFormError("Nama wajib diisi");
    if (!form.unit_kerja.trim()) return setFormError("Unit kerja wajib diisi");
    setSubmitting(true);
    setFormError(null);
    try {
      if (!isTauri) {
        // mock mode: update local state
        if (editing) {
          setData((prev) => prev.map((p) => (p.id === editing.id ? { ...p, ...form, updated_at: new Date().toISOString() } : p)));
        } else {
          const newId = Math.max(0, ...data.map((d) => d.id)) + 1;
          setData((prev) => [
            ...prev,
            {
              id: newId,
              nama: form.nama.trim(),
              unit_kerja: form.unit_kerja.trim(),
              nip_nuptk: form.nip_nuptk?.trim() || null,
              no_hp: form.no_hp?.trim() || null,
              status_aktif: form.status_aktif,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);
        }
        setOpen(false);
        return;
      }
      if (editing) {
        const updated = await invoke<Anggota>("update_anggota", {
          id: editing.id,
          input: {
            nama: form.nama.trim(),
            unit_kerja: form.unit_kerja.trim(),
            nip_nuptk: form.nip_nuptk?.trim() || null,
            no_hp: form.no_hp?.trim() || null,
            status_aktif: form.status_aktif,
          },
        });
        setData((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        const created = await invoke<Anggota>("add_anggota", {
          input: {
            nama: form.nama.trim(),
            unit_kerja: form.unit_kerja.trim(),
            nip_nuptk: form.nip_nuptk?.trim() || null,
            no_hp: form.no_hp?.trim() || null,
            status_aktif: form.status_aktif,
          },
        });
        setData((prev) => [...prev, created]);
      }
      setOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err);
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (!isTauri) {
        setData((prev) => prev.map((p) => (p.id === deleteTarget.id ? { ...p, status_aktif: false } : p)));
        setDeleteTarget(null);
        return;
      }
      await invoke<string>("delete_anggota", { id: deleteTarget.id });
      setData((prev) => prev.map((p) => (p.id === deleteTarget.id ? { ...p, status_aktif: false } : p)));
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err);
      setError(msg);
      setDeleteTarget(null);
    }
  };

  const downloadTemplate = async () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Nama", "NIP/NUPTK", "Unit Kerja", "No HP"],
      ["Budi Santoso", "198001012010011001", "SDN 1 Rejoso", "08123456789"],
      ["Siti Aminah", "198505052009021003", "SDN 2 Rejoso", "082112334455"],
    ]);
    ws["!cols"] = [{ wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Anggota");
    await saveXlsx(wb, "template-anggota.xlsx");
  };

  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        // header row 0, data from 1
        const rows: { nama: string; nip_nuptk: string; unit_kerja: string; no_hp: string }[] = [];
        for (let i = 1; i < json.length; i++) {
          const r = json[i];
          if (!r || r.length === 0) continue;
          // support 4 kolom wajib
          rows.push({
            nama: String(r[0] ?? "").trim(),
            nip_nuptk: String(r[1] ?? "").trim(),
            unit_kerja: String(r[2] ?? "").trim(),
            no_hp: String(r[3] ?? "").trim(),
          });
        }
        setImportRows(rows);
      } catch (err) {
        setImportResult({ sukses: 0, gagal: [{ baris: 0, alasan: String(err) }] });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const doImport = async () => {
    if (importRows.length === 0) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const res = await invoke<{ sukses: number; gagal: { baris: number; alasan: string }[]; total: number }>("bulk_import_anggota", { rows: importRows });
      setImportResult({ sukses: res.sukses, gagal: res.gagal });
      fetchData(search, statusFilter);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("invoke")) {
        // mock untuk browser
        let sukses = 0;
        const gagal: { baris: number; alasan: string }[] = [];
        importRows.forEach((r, idx) => {
          if (!r.nama || !r.nip_nuptk || !r.unit_kerja || !r.no_hp) gagal.push({ baris: idx + 2, alasan: "4 kolom wajib diisi" });
          else sukses++;
        });
        setImportResult({ sukses, gagal });
        // tambahkan mock ke tabel
        const newData = importRows.filter((r) => r.nama && r.nip_nuptk && r.unit_kerja && r.no_hp).map((r, i) => ({
          id: data.length + i + 100,
          nama: r.nama,
          nip_nuptk: r.nip_nuptk,
          unit_kerja: r.unit_kerja,
          no_hp: r.no_hp,
          status_aktif: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        setData((prev) => [...prev, ...newData]);
      } else setImportResult({ sukses: 0, gagal: [{ baris: 0, alasan: msg }] });
    } finally { setImportLoading(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Daftar Anggota</h2>
          <p className="text-sm text-white/80">Kelola nama anggota — {filteredCount} orang</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => fetchData(search, statusFilter)} disabled={loading} className="bg-white text-[#667eea]">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Muat Ulang
          </Button>
          <Button variant="secondary" size="sm" onClick={downloadTemplate} className="bg-white text-[#667eea]">
            <Download className="h-4 w-4" /> Unduh Template
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)} className="bg-white text-[#667eea]">
            <Upload className="h-4 w-4" /> Impor Excel
          </Button>
          <Button onClick={openAdd} className="bg-white text-[#667eea]">
            <Plus className="h-4 w-4" /> Tambah Anggota
          </Button>
        </div>
      </div>

      {error && <div className="bg-white/90 border text-sm px-3 py-2 rounded-md text-slate-800">{error}</div>}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Daftar Nama Anggota
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari nama atau sekolah..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-1">
              <Button variant={statusFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("all")}>
                Semua
              </Button>
              <Button variant={statusFilter === "aktif" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("aktif")}>
                Masih Aktif
              </Button>
              <Button variant={statusFilter === "nonaktif" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("nonaktif")}>
                Tidak Aktif
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Memuat data...
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Belum ada data anggota.</p>
              <p className="text-xs">Klik "Tambah Anggota" untuk menambah data pertama.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Unit Kerja</TableHead>
                    <TableHead>NIP/NUPTK</TableHead>
                    <TableHead>No HP</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedData.map((a, idx) => (
                    <TableRow key={a.id} className={!a.status_aktif ? "opacity-60" : ""}>
                      <TableCell className="text-xs text-muted-foreground">{(page - 1) * pageSize + idx + 1}</TableCell>
                      <TableCell className="font-medium">{a.nama}</TableCell>
                      <TableCell className="text-sm">{a.unit_kerja}</TableCell>
                      <TableCell className="text-sm">{a.nip_nuptk || <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell className="text-sm">{a.no_hp || <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell>
                        {a.status_aktif ? (
                          <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Nonaktif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline ml-1">Edit</span>
                        </Button>
                        {a.status_aktif && (
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(a)}>
                            <UserX className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline ml-1">Nonaktifkan</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {data.length > 0 && <PaginationControls page={page} totalPages={totalPages} totalItems={data.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />}
        </CardContent>
      </Card>

      {/* Dialog Form Tambah/Edit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Ubah Data Anggota" : "Tambah Anggota Baru"}</DialogTitle>
            <DialogDescription>Lengkapi nama dan sekolah. Tanda * wajib diisi.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nama">
                Nama <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nama"
                value={form.nama}
                onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
                placeholder="mis. Budi Santoso"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">
                Unit Kerja <span className="text-destructive">*</span>
              </Label>
              <Input
                id="unit"
                value={form.unit_kerja}
                onChange={(e) => setForm((f) => ({ ...f, unit_kerja: e.target.value }))}
                placeholder="mis. SDN 1 Rejoso"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nip">NIP / NUPTK</Label>
                <Input
                  id="nip"
                  value={form.nip_nuptk ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, nip_nuptk: e.target.value || null }))}
                  placeholder="Opsional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hp">No HP</Label>
                <Input
                  id="hp"
                  value={form.no_hp ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, no_hp: e.target.value || null }))}
                  placeholder="Opsional, mis. 08123..."
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="aktif"
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={form.status_aktif}
                onChange={(e) => setForm((f) => ({ ...f, status_aktif: e.target.checked }))}
              />
              <Label htmlFor="aktif" className="font-normal">
                Anggota aktif
              </Label>
            </div>
            {formError && <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-md">{formError}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Simpan Perubahan" : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Nonaktifkan */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nonaktifkan Anggota?</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.nama}</strong> tidak akan muncul di daftar bayar lagi, tapi riwayat iurannya tetap ada. Lanjutkan?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Ya, Nonaktifkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Impor Anggota */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Impor Anggota dari Excel</DialogTitle>
            <DialogDescription>File harus punya 4 kolom wajib: Nama, NIP/NUPTK, Unit Kerja, No HP. Baris kosong akan gagal. Unduh template dulu jika belum punya.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate}><Download className="h-4 w-4" /> Unduh Template</Button>
              <Input type="file" accept=".xlsx,.xls,.csv" onChange={onImportFile} className="flex-1" />
            </div>
            {importFileName && <div className="text-xs text-muted-foreground">File: {importFileName} — {importRows.length} baris terbaca</div>}
            {importRows.length > 0 && (
              <div className="border rounded-md max-h-48 overflow-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Nama</TableHead><TableHead>NIP</TableHead><TableHead>Unit</TableHead><TableHead>No HP</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {importRows.slice(0, 10).map((r, i) => (
                      <TableRow key={i} className={!r.nama || !r.nip_nuptk || !r.unit_kerja || !r.no_hp ? "bg-destructive/10" : ""}>
                        <TableCell>{i + 2}</TableCell><TableCell>{r.nama || <span className="text-destructive">kosong</span>}</TableCell><TableCell>{r.nip_nuptk || <span className="text-destructive">kosong</span>}</TableCell><TableCell>{r.unit_kerja || <span className="text-destructive">kosong</span>}</TableCell><TableCell>{r.no_hp || <span className="text-destructive">kosong</span>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {importRows.length > 10 && <div className="text-xs text-center p-1">+{importRows.length - 10} baris lain</div>}
              </div>
            )}
            {importResult && (
              <div className={`text-sm p-2 rounded-md border ${importResult.gagal.length === 0 ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
                <div>Sukses: {importResult.sukses} / {importRows.length} — Gagal: {importResult.gagal.length}</div>
                {importResult.gagal.length > 0 && <div className="text-xs mt-1">{importResult.gagal.slice(0, 5).map((g) => `Baris ${g.baris}: ${g.alasan}`).join(" | ")}{importResult.gagal.length > 5 ? ` +${importResult.gagal.length - 5} lagi` : ""}</div>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Tutup</Button>
            <Button onClick={doImport} disabled={importRows.length === 0 || importLoading}>
              {importLoading && <Loader2 className="h-4 w-4 animate-spin" />} Impor {importRows.length} Baris
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
