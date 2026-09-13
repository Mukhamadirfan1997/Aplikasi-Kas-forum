import { useEffect, useState, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PaginationControls } from "@/components/ui/pagination-controls";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatRupiah } from "@/lib/utils";
import { saveDataUrl } from "@/lib/fileSave";
import {
  Loader2,
  Plus,
  Trash2,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
} from "lucide-react";

type Kategori = { id: number; nama: string; tipe: string };
type KasView = {
  id: number;
  tipe: string;
  kategori_id: number | null;
  kategori_nama: string | null;
  nominal: number;
  tanggal: string;
  keterangan: string;
  referensi_pembayaran_id: number | null;
  bukti: string | null;
  penanggung_jawab: string | null;
  created_at: string;
};

export function Transaksi() {
  const today = new Date().toISOString().slice(0, 10);
  const [saldo, setSaldo] = useState<number | null>(null);
  const [kategoriList, setKategoriList] = useState<Kategori[]>([]);
  const [list, setList] = useState<KasView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // filters
  const [filterTipe, setFilterTipe] = useState<"all" | "masuk" | "keluar">(
    "all",
  );
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");

  // form
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    tipe: "keluar" as "masuk" | "keluar",
    kategori_id: "",
    nominal: "",
    tanggal: today,
    keterangan: "",
  });
  const [penanggungJawab, setPenanggungJawab] = useState("");
  const [pjResults, setPjResults] = useState<{ id: number; nama: string }[]>(
    [],
  );
  const [buktiPreview, setBuktiPreview] = useState<string | null>(null);
  const [buktiName, setBuktiName] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  useEffect(() => { setPage(1); }, [list.length, pageSize, filterTipe]);
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const pagedList = useMemo(() => list.slice((page - 1) * pageSize, page * pageSize), [list, page, pageSize]);
  const [buktiView, setBuktiView] = useState<string | null>(null);

  const fetchSaldo = async () => {
    try {
      const detail = await invoke<{ saldo: number }>("get_saldo_detail");
      setSaldo(detail.saldo);
    } catch {
      try {
        const s = await invoke<number>("get_saldo");
        setSaldo(s);
      } catch {}
    }
  };

  // autocomplete penanggung jawab — sederhana: ketik nama/NIP
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!penanggungJawab.trim() || penanggungJawab.length < 2) {
        setPjResults([]);
        return;
      }
      try {
        const r = await invoke<{ id: number; nama: string }[]>("get_anggota", {
          search: penanggungJawab,
          statusAktif: true,
        } as any);
        setPjResults(
          r.slice(0, 6).map((a: any) => ({ id: a.id, nama: a.nama })),
        );
      } catch {
        setPjResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [penanggungJawab]);

  const fetchKategori = async () => {
    try {
      const k = await invoke<Kategori[]>("get_kategori_list");
      setKategoriList(k);
    } catch (e: unknown) {
      if (String(e).includes("invoke")) {
        setKategoriList([
          { id: 1, nama: "Iuran Anggota", tipe: "masuk" },
          { id: 2, nama: "Konsumsi", tipe: "keluar" },
          { id: 3, nama: "ATK", tipe: "keluar" },
          { id: 4, nama: "Kegiatan", tipe: "keluar" },
          { id: 5, nama: "Lain-lain", tipe: "keluar" },
        ]);
      }
    }
  };

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await invoke<KasView[]>("get_kas_transaksi", {
        tipe: filterTipe === "all" ? null : filterTipe,
        kategoriId: null,
        dari: dari || null,
        sampai: sampai || null,
        limit: 200,
      } as any);
      setList(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("invoke")) {
        setList([
          {
            id: 101,
            tipe: "masuk",
            kategori_id: 1,
            kategori_nama: "Iuran Anggota",
            nominal: 50000,
            tanggal: today,
            keterangan: "Iuran 9-2026 - Budi",
            referensi_pembayaran_id: 1,
            bukti: null,
            penanggung_jawab: null,
            created_at: today,
          },
          {
            id: 102,
            tipe: "keluar",
            kategori_id: 2,
            kategori_nama: "Konsumsi",
            nominal: 75000,
            tanggal: today,
            keterangan: "Konsumsi rapat — ditugaskan Budi",
            referensi_pembayaran_id: null,
            bukti: null,
            penanggung_jawab: "Budi Santoso",
            created_at: today,
          },
        ]);
        setSaldo(125000);
      } else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKategori();
    fetchSaldo();
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterTipe]);

  const onBukti = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) {
      setBuktiPreview(null);
      setBuktiName(null);
      return;
    }
    if (f.size > 3 * 1024 * 1024) {
      setFormError("Bukti maksimal 3MB");
      return;
    }
    setBuktiName(f.name);
    const r = new FileReader();
    r.onload = () => setBuktiPreview(r.result as string);
    r.readAsDataURL(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const nom = parseInt(form.nominal);
    if (!form.keterangan.trim()) return setFormError("Keterangan harus diisi");
    if (!nom || nom <= 0) return setFormError("Jumlah uang harus lebih dari 0");
    if (!form.kategori_id) return setFormError(form.tipe === "keluar" ? "Pilih jenis pengeluaran" : "Pilih jenis pemasukan");
    if (form.tipe === "keluar" && !buktiPreview) return setFormError("Wajib upload foto nota / bukti untuk pengeluaran");
    if (form.tipe === "keluar" && saldo !== null && nom > saldo)
      return setFormError(`Uang kas tidak cukup. Sisa: ${formatRupiah(saldo)}`);
    if (form.tipe === "masuk") {
      const katName = kategoriList.find((k) => String(k.id) === form.kategori_id)?.nama?.toLowerCase() ?? "";
      if (katName.includes("iuran")) return setFormError("⛔ Iuran anggota DILARANG di sini! Gunakan Kas → Iuran agar checklist ✓.");
      if (!confirm("⚠️ Yakin ini BUKAN iuran anggota?\n\n• Iuran → WAJIB via Kas → Iuran\n• Saldo awal → Pengaturan → Saldo Awal\n\nForm ini HANYA untuk pemasukan umum (sumbangan/hibah/bonus).\nLanjutkan simpan pemasukan?")) return;
    }

    setSubmitting(true);
    try {
      const created = await invoke<KasView>("add_kas_transaksi", {
        input: {
          tipe: form.tipe,
          kategori_id: form.kategori_id ? parseInt(form.kategori_id) : null,
          nominal: nom,
          tanggal: form.tanggal,
          keterangan: form.keterangan.trim(),
          bukti: buktiPreview,
          penanggung_jawab: penanggungJawab.trim() || null,
        },
      });
      setList((prev) => [created, ...prev]);
      setSuccess("Transaksi berhasil disimpan.");
      setOpen(false);
      setForm({
        tipe: "keluar",
        kategori_id: "",
        nominal: "",
        tanggal: today,
        keterangan: "",
      });
      setPenanggungJawab("");
      setPjResults([]);
      setBuktiPreview(null);
      setBuktiName(null);
      fetchSaldo();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("invoke")) {
        const mock: KasView = {
          id: Date.now(),
          tipe: form.tipe,
          kategori_id: form.kategori_id ? parseInt(form.kategori_id) : null,
          kategori_nama:
            kategoriList.find((k) => String(k.id) === form.kategori_id)?.nama ??
            null,
          nominal: nom,
          tanggal: form.tanggal,
          keterangan: form.keterangan.trim(),
          referensi_pembayaran_id: null,
          bukti: buktiPreview,
          penanggung_jawab: penanggungJawab.trim() || null,
          created_at: today,
        };
        setList((prev) => [mock, ...prev]);
        if (form.tipe === "keluar" && saldo !== null) setSaldo(saldo - nom);
        if (form.tipe === "masuk" && saldo !== null) setSaldo(saldo + nom);
        setOpen(false);
        setForm({
          tipe: "keluar",
          kategori_id: "",
          nominal: "",
          tanggal: today,
          keterangan: "",
        });
        setPenanggungJawab("");
        setPjResults([]);
        setBuktiPreview(null);
        setBuktiName(null);
        setSuccess("(Mock) Transaksi dicatat (preview).");
      } else setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, isIuran: boolean) => {
    if (isIuran)
      return setError(
        "Transaksi iuran tidak bisa dihapus di sini — batalkan via Iuran.",
      );
    if (!confirm("Hapus transaksi ini?")) return;
    try {
      await invoke("delete_kas_transaksi", { id });
      setList((prev) => prev.filter((x) => x.id !== id));
      fetchSaldo();
      setSuccess("Transaksi dihapus.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("invoke")) {
        setList((prev) => prev.filter((x) => x.id !== id));
        setSuccess("(Mock) Dihapus.");
      } else setError(msg);
    }
  };

  const kategoriKeluar = kategoriList.filter((k) => k.tipe === "keluar");
  const kategoriMasuk = kategoriList.filter((k) => k.tipe === "masuk" && k.nama !== "Saldo Awal" && k.nama !== "Iuran Anggota");
  const kategoriOptions = form.tipe === "masuk" ? kategoriMasuk : kategoriKeluar;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
            <Wallet className="h-6 w-6" /> Pengeluaran & Pemasukan
          </h2>
          <p className="text-sm text-white/80">
            Catat uang masuk selain iuran (sumbangan, bonus) & uang keluar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Card className="px-3 py-2">
            <div className="text-xs text-muted-foreground">Sisa Uang Kas</div>
            <div className="font-bold text-lg">
              {saldo === null ? "—" : formatRupiah(saldo)}
            </div>
          </Card>
          <div className="flex gap-2">
            <Button
              onClick={() => { setForm((f) => ({ ...f, tipe: "masuk", kategori_id: "" })); setBuktiPreview(null); setBuktiName(null); setFormError(null); setOpen(true); }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white shadow"
              title="Hanya untuk pemasukan BUKAN iuran. Iuran via Kas → Iuran"
            >
              <ArrowUpCircle className="h-4 w-4" /> Tambah Pemasukan
            </Button>
            <Button
              onClick={() => { setForm((f) => ({ ...f, tipe: "keluar", kategori_id: "" })); setBuktiPreview(null); setBuktiName(null); setOpen(true); }}
              className="bg-white text-[#667eea] hover:bg-white/90 shadow"
            >
              <Plus className="h-4 w-4" /> Tambah Pengeluaran
            </Button>
          </div>
        </div>
      </div>

      <Card className="border-amber-300 bg-amber-50">
        <CardContent className="py-3 text-sm space-y-1">
          <div className="font-semibold text-amber-800">⚠️ Perhatian — Jangan salah input!</div>
          <div className="text-amber-900/80 text-xs leading-relaxed">
            • <strong>Iuran anggota</strong> → WAJIB via <strong>Kas → Iuran</strong> (agar checklist & laporan iuran otomatis centang). Jika iuran diinput di sini, <strong>tidak akan terhitung sebagai iuran</strong>.<br/>
            • <strong>Saldo awal tahun lalu</strong> → via <strong>Pengaturan → Saldo Awal</strong> (kategori Saldo Awal khusus).<br/>
            • <strong>Form ini (Pemasukan)</strong> hanya untuk <strong>sumbangan, hibah, bonus, pendapatan lain selain iuran</strong> + pengeluaran umum.
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-3 py-2 rounded-md">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-3 py-2 rounded-md">
          {success}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cari Riwayat</CardTitle>
          <div className="flex flex-wrap gap-2 pt-2">
            <div className="flex gap-1">
              <Button
                variant={filterTipe === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterTipe("all")}
              >
                Semua
              </Button>
              <Button
                variant={filterTipe === "masuk" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterTipe("masuk")}
              >
                Masuk
              </Button>
              <Button
                variant={filterTipe === "keluar" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterTipe("keluar")}
              >
                Keluar
              </Button>
            </div>
            <Input
              type="date"
              value={dari}
              onChange={(e) => setDari(e.target.value)}
              className="w-40"
              placeholder="Dari"
            />
            <Input
              type="date"
              value={sampai}
              onChange={(e) => setSampai(e.target.value)}
              className="w-40"
              placeholder="Sampai"
            />
            <Button variant="outline" size="sm" onClick={fetchList}>
              Terapkan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat...
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Belum ada transaksi.
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Keperluan</TableHead>
                    <TableHead>Nama Petugas</TableHead>
                    <TableHead>Foto Nota</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedList.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{r.tanggal}</TableCell>
                      <TableCell>
                        {r.tipe === "masuk" ? (
                          <Badge className="bg-emerald-600">
                            <ArrowUpCircle className="h-3 w-3 mr-1" /> Masuk
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <ArrowDownCircle className="h-3 w-3 mr-1" /> Keluar
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.kategori_nama ?? "-"}
                      </TableCell>
                      <TableCell
                        className="text-sm max-w-[260px] truncate"
                        title={r.keterangan}
                      >
                        {r.keterangan}{" "}
                        {r.referensi_pembayaran_id && (
                          <span className="text-xs text-muted-foreground">
                            (iuran)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.penanggung_jawab ? (
                          <span className="bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                            {r.penanggung_jawab}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.bukti ? (
                          <button type="button" onClick={() => setBuktiView(r.bukti)} className="p-0 border rounded overflow-hidden hover:opacity-80">
                            <img src={r.bukti} alt="bukti" className="h-8 w-8 object-cover" title="Klik untuk lihat bukti" />
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${r.tipe === "masuk" ? "text-emerald-600" : "text-destructive"}`}
                      >
                        {r.tipe === "masuk" ? "+" : "-"}{" "}
                        {formatRupiah(r.nominal)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive h-7"
                          onClick={() =>
                            handleDelete(r.id, !!r.referensi_pembayaran_id)
                          }
                          disabled={!!r.referensi_pembayaran_id}
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
          {list.length > 0 && <PaginationControls page={page} totalPages={totalPages} totalItems={list.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />}
        </CardContent>
      </Card>

      <Dialog open={!!buktiView} onOpenChange={(o) => !o && setBuktiView(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Foto Nota / Bukti</DialogTitle></DialogHeader>
          {buktiView && (
            <div className="flex justify-center bg-muted p-2 rounded">
              {buktiView.startsWith("data:application/pdf") ? (
                <iframe src={buktiView} className="w-full h-[70vh] rounded border" title="bukti pdf" />
              ) : (
                <img src={buktiView} alt="bukti besar" className="max-h-[70vh] max-w-full object-contain rounded border" />
              )}
            </div>
          )}
          <div className="flex justify-end gap-2">
            {buktiView && <Button variant="outline" size="sm" onClick={() => saveDataUrl(buktiView, `bukti-${Date.now()}`)}>Unduh</Button>}
            <Button variant="outline" size="sm" onClick={() => setBuktiView(null)}>Tutup</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.tipe === "masuk" ? "Tambah Pemasukan (Selain Iuran)" : "Tambah Uang Keluar"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Jenis Transaksi *</Label>
              <select value={form.tipe} onChange={(e) => setForm((f) => ({ ...f, tipe: e.target.value as any, kategori_id: "" }))} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                <option value="masuk">Pemasukan (sumbangan, bonus, dll — selain iuran)</option>
                <option value="keluar">Pengeluaran</option>
              </select>
              {form.tipe === "masuk" ? (
                <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 space-y-1">
                  <div className="font-semibold">⛔ DILARANG input iuran di sini!</div>
                  <div>Iuran anggota <strong>WAJIB</strong> via <strong>Kas → Iuran</strong> agar checklist otomatis ✓ dan masuk laporan iuran. Form ini <strong>hanya</strong> untuk sumbangan/hibah/bonus/lainnya. Jika iuran diinput di sini, anggota tetap dianggap <strong>Belum Lunas</strong>.</div>
                  <div>Saldo awal tahun lalu → <strong>Pengaturan → Saldo Awal</strong>.</div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Iuran anggota tidak di sini — lihat Kas → Iuran. Pengeluaran akan mengurangi saldo (dicek otomatis).</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Tanggal</Label>
              <Input
                type="date"
                value={form.tanggal}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tanggal: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>{form.tipe === "masuk" ? "Jenis Pemasukan *" : "Jenis Pengeluaran *"}</Label>
              <select
                value={form.kategori_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, kategori_id: e.target.value }))
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">— Pilih —</option>
                {kategoriOptions.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
              </select>
              {form.tipe==="masuk" && kategoriMasuk.length===0 && <p className="text-xs text-amber-600">Belum ada kategori pemasukan. Tambah di Pengaturan → Jenis Keperluan (tipe Masuk).</p>}
            </div>
            <div className="space-y-1">
              <Label>Jumlah Uang *</Label>
              <Input
                type="number"
                value={form.nominal}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nominal: e.target.value }))
                }
                placeholder="mis. 50000"
              />
              {form.nominal && (
                <div className="text-xs text-muted-foreground">
                  {formatRupiah(parseInt(form.nominal) || 0)}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label>Keperluan / Keterangan *</Label>
              <Input
                value={form.keterangan}
                onChange={(e) =>
                  setForm((f) => ({ ...f, keterangan: e.target.value }))
                }
                placeholder="mis. Beli konsumsi rapat"
              />
            </div>
            <div className="space-y-1 relative">
              <Label>Nama Petugas (jika ada yang ditugaskan)</Label>
              <Input
                placeholder="ketik nama, mis. Budi..."
                value={penanggungJawab}
                onChange={(e) => setPenanggungJawab(e.target.value)}
              />
              {pjResults.length > 0 && (
                <div className="absolute z-10 w-full bg-white border rounded-md shadow max-h-32 overflow-auto mt-1">
                  {pjResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPenanggungJawab(p.nama);
                        setPjResults([]);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                    >
                      {p.nama}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Kosongkan jika tidak ada petugas khusus. Contoh: Budi ditugaskan
                beli ATK.
              </p>
            </div>
            <div className="space-y-1">
              <Label>Foto Nota / Bukti {form.tipe === "keluar" ? "*" : "(opsional untuk pemasukan)"}</Label>
              <Input type="file" accept="image/*,.pdf" onChange={onBukti} />
              {buktiName && (
                <div className="flex gap-2 items-center text-xs">
                  <span className="truncate">{buktiName}</span>
                  {buktiPreview && (
                    <img
                      src={buktiPreview}
                      alt="preview"
                      className="h-12 w-12 object-cover rounded border"
                    />
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {form.tipe === "keluar" ? "Wajib upload foto nota atau bukti transfer." : "Opsional — upload jika ada bukti sumbangan."}
              </p>
            </div>
            {saldo !== null && (
              <div className="text-xs text-muted-foreground">
                Sisa uang kas sekarang: {formatRupiah(saldo)}
              </div>
            )}
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
    </div>
  );
}
