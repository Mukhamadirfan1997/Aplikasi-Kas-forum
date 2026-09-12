import { useEffect, useState, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { formatRupiah } from "@/lib/utils";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Loader2, CheckSquare, Wallet, Calendar, Search, CreditCard } from "lucide-react";

type Periode = { id: number; bulan: number; tahun: number; nominal_wajib: number; created_at: string };
type Pembayaran = { id: number; anggota_id: number; periode_id: number; tanggal_bayar: string; nominal: number; metode: string; keterangan: string | null; bukti_transfer: string | null; created_at: string };
type Anggota = { id: number; nama: string; unit_kerja: string; status_aktif: boolean };
type IuranStatus = { anggota: Anggota; pembayaran: Pembayaran | null; sudah_bayar: boolean };

const BULAN_NAMES = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export function Iuran() {
  const today = new Date().toISOString().slice(0, 10);
  const nowMonth = new Date().getMonth() + 1;
  const nowYear = new Date().getFullYear();

  const [bulan, setBulan] = useState(nowMonth);
  const [tahun, setTahun] = useState(nowYear);
  const [periode, setPeriode] = useState<Periode | null>(null);
  const [nominalEdit, setNominalEdit] = useState("10000");
  const [periodeLoading, setPeriodeLoading] = useState(false);
  const [periodeList, setPeriodeList] = useState<Periode[]>([]);

  const [statusList, setStatusList] = useState<IuranStatus[]>([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // bulk form
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [tanggalBayar, setTanggalBayar] = useState(today);
  const [metode, setMetode] = useState<"tunai" | "transfer">("tunai");
  const [buktiPreview, setBuktiPreview] = useState<string | null>(null);
  const [buktiFileName, setBuktiFileName] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [bayarOpen, setBayarOpen] = useState(false);
  // Bayar Setahun — search nama/NIP
  const [setahunOpen, setSetahunOpen] = useState(false);
  const [searchAnggota, setSearchAnggota] = useState("");
  const [searchResults, setSearchResults] = useState<Anggota[]>([]);
  const [selectedAnggotaSetahun, setSelectedAnggotaSetahun] = useState<Anggota | null>(null);
  const [tahunSetahun, setTahunSetahun] = useState(nowYear);
  const [bulanChecks, setBulanChecks] = useState<boolean[]>(Array(12).fill(true));
  const [paidMonthsSetahun, setPaidMonthsSetahun] = useState<number[]>([]);
  const [setahunTanggal, setSetahunTanggal] = useState(today);
  const [setahunMetode, setSetahunMetode] = useState<"tunai" | "transfer">("tunai");
  const [setahunBukti, setSetahunBukti] = useState<string | null>(null);
  const [setahunBuktiName, setSetahunBuktiName] = useState<string | null>(null);
  const [setahunLoading, setSetahunLoading] = useState(false);
  const [buktiView, setBuktiView] = useState<string | null>(null);

  void error;
  const fetchPeriodeList = async () => {
    try {
      const list = await invoke<Periode[]>("get_periode_list");
      setPeriodeList(list);
    } catch {
      // ignore in mock
    }
  };

  useEffect(() => {
    fetchPeriodeList();
    // auto buka periode bulan berjalan supaya daftar nama langsung terlihat
    openPeriode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openPeriode = async () => {
    setPeriodeLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const p = await invoke<Periode>("get_or_create_periode", { bulan, tahun, nominal_wajib: parseInt(nominalEdit) || 10000 } as any);
      setPeriode(p);
      setNominalEdit(String(p.nominal_wajib));
      await fetchStatus(p.id);
      fetchPeriodeList();
    } catch (e: unknown) {
      const msg = errMsg(e);
      if (msg.includes("invoke")) {
        const mockP: Periode = { id: 999, bulan, tahun, nominal_wajib: parseInt(nominalEdit) || 10000, created_at: new Date().toISOString() };
        setPeriode(mockP);
        // mock status list
        const mockStatus: IuranStatus[] = [
          { anggota: { id: 1, nama: "Budi Santoso", unit_kerja: "SDN 1", status_aktif: true }, pembayaran: null, sudah_bayar: false },
          { anggota: { id: 2, nama: "Siti Aminah", unit_kerja: "SDN 2", status_aktif: true }, pembayaran: { id: 1, anggota_id: 2, periode_id: 999, tanggal_bayar: today, nominal: 10000, metode: "tunai", keterangan: null, bukti_transfer: null, created_at: today }, sudah_bayar: true },
          { anggota: { id: 3, nama: "Ahmad Fauzi", unit_kerja: "SDN 3", status_aktif: true }, pembayaran: null, sudah_bayar: false },
        ];
        setStatusList(mockStatus);
      } else setError(msg);
    } finally {
      setPeriodeLoading(false);
    }
  };

  const fetchStatus = async (periodeId: number) => {
    setStatusLoading(true);
    try {
      const list = await invoke<IuranStatus[]>("get_iuran_status", { periode_id: periodeId } as any);
      setStatusList(list);
      setSelected(new Set());
    } catch (e: unknown) {
      setError(errMsg(e));
    } finally {
      setStatusLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return statusList;
    const q = search.toLowerCase();
    return statusList.filter((s) => s.anggota.nama.toLowerCase().includes(q) || s.anggota.unit_kerja.toLowerCase().includes(q));
  }, [statusList, search]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  useEffect(() => { setPage(1); }, [search, statusList.length, pageSize]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedFiltered = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);

  const belumBayar = useMemo(() => statusList.filter((s) => !s.sudah_bayar), [statusList]);
  const sudahBayar = useMemo(() => statusList.filter((s) => s.sudah_bayar), [statusList]);

  const toggle = (id: number) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };
  const toggleAllBelum = () => {
    const ids = belumBayar.filter((s) => filtered.some((f) => f.anggota.id === s.anggota.id)).map((s) => s.anggota.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const n = new Set(prev);
      if (allSelected) ids.forEach((id) => n.delete(id));
      else ids.forEach((id) => n.add(id));
      return n;
    });
  };

  const onBuktiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) { setBuktiPreview(null); setBuktiFileName(null); return; }
    if (file.size > 3 * 1024 * 1024) { setError("File bukti maksimal 3MB"); return; }
    setBuktiFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setBuktiPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleBulkBayar = async () => {
    if (!periode) return;
    if (selected.size === 0) return setError("Pilih minimal 1 anggota yang belum bayar");
    if (metode === "transfer" && !buktiPreview) return setError("Wajib upload bukti transfer untuk metode transfer");
    setBulkLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const ids = Array.from(selected);
      await invoke("bayar_iuran_bulk", {
        input: { periode_id: periode.id, anggota_ids: ids, tanggal_bayar: tanggalBayar, metode, keterangan: null, bukti_transfer: metode === "transfer" ? buktiPreview : null },
      });
        setSuccess(`${ids.length} orang berhasil dicatat lunas untuk ${BULAN_NAMES[periode.bulan]} ${periode.tahun}.`);
      await fetchStatus(periode.id);
      setSelected(new Set());
      setBuktiPreview(null); setBuktiFileName(null);
    } catch (e: unknown) {
      const msg = errMsg(e);
      if (msg.includes("invoke")) {
        // mock success
        setStatusList((prev) => prev.map((s) => (selected.has(s.anggota.id) ? { ...s, sudah_bayar: true, pembayaran: { id: Date.now(), anggota_id: s.anggota.id, periode_id: periode.id, tanggal_bayar: tanggalBayar, nominal: periode.nominal_wajib, metode, keterangan: null, bukti_transfer: buktiPreview, created_at: today } } : s)));
        setSuccess(`${selected.size} orang dicatat lunas.`);
        setSelected(new Set());
        setBuktiPreview(null); setBuktiFileName(null);
      } else setError(msg);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBatal = async (pembayaranId: number) => {
    if (!periode) return;
    if (!confirm("Batalkan pembayaran ini? Kas masuk terkait juga akan dihapus.")) return;
    try {
      await invoke("hapus_pembayaran", { pembayaran_id: pembayaranId } as any);
      await fetchStatus(periode.id);
      setSuccess("Pembayaran dibatalkan.");
    } catch (e: unknown) {
      const msg = errMsg(e);
      if (msg.includes("invoke")) {
        setStatusList((prev) => prev.map((s) => (s.pembayaran?.id === pembayaranId ? { ...s, sudah_bayar: false, pembayaran: null } : s)));
        setSuccess("Pembayaran dibatalkan.");
      } else setError(msg);
    }
  };

  // === Bayar Setahun helpers (cari nama/NIP) ===
  const doSearchAnggota = async (keyword: string) => {
    if (!keyword.trim()) { setSearchResults([]); return; }
    try {
      const res = await invoke<Anggota[]>("get_anggota", { search: keyword, statusAktif: true } as any);
      setSearchResults(res.slice(0, 8));
    } catch {
      // mock filter dari statusList
      const all = statusList.map(s=>s.anggota);
      const q = keyword.toLowerCase();
      setSearchResults(all.filter(a=> a.nama.toLowerCase().includes(q) || (a as any).nip_nuptk?.toLowerCase().includes(q)).slice(0,8));
      if (all.length===0) setSearchResults([{ id:1, nama:"Budi Santoso", unit_kerja:"SDN 1", status_aktif:true } as any].filter(a=>a.nama.toLowerCase().includes(q)));
    }
  };
  useEffect(()=>{ const t=setTimeout(()=> doSearchAnggota(searchAnggota), 300); return()=>clearTimeout(t); }, [searchAnggota]);
  const fetchPaidMonthsSetahun = async (anggotaId:number, tahun:number) => {
    try {
      const matrix = await invoke<{ id:number; paid:number[] }[]>("get_checklist_matrix", { tahun } as any);
      const found = matrix.find(m=>m.id===anggotaId);
      setPaidMonthsSetahun(found?.paid || []);
      setBulanChecks(Array.from({length:12},(_,i)=> !found?.paid.includes(i+1)));
    } catch {
      setPaidMonthsSetahun([]);
      setBulanChecks(Array(12).fill(true));
    }
  };
  useEffect(()=>{ if(selectedAnggotaSetahun) fetchPaidMonthsSetahun(selectedAnggotaSetahun.id, tahunSetahun); }, [selectedAnggotaSetahun, tahunSetahun]);
  const onSetahunBuktiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f=e.target.files?.[0]; if(!f){ setSetahunBukti(null); setSetahunBuktiName(null); return; }
    if(f.size>3*1024*1024){ setError("Bukti maksimal 3MB"); return; }
    setSetahunBuktiName(f.name);
    const r=new FileReader(); r.onload=()=>setSetahunBukti(r.result as string); r.readAsDataURL(f);
  };
  const handleBayarSetahun = async () => {
    if(!selectedAnggotaSetahun) return setError("Pilih anggota dulu (ketik nama/NIP)");
    const bulanList = bulanChecks.map((c,i)=> c? i+1 : null).filter(Boolean) as number[];
    if(bulanList.length===0) return setError("Pilih minimal 1 bulan");
    if(setahunMetode==="transfer" && !setahunBukti) return setError("Wajib upload bukti untuk transfer");
    setSetahunLoading(true); setError(null); setSuccess(null);
    try {
      const res = await invoke<{ created:number; skipped:number[] }>("bayar_iuran_setahun", { input: { anggota_id: selectedAnggotaSetahun.id, tahun: tahunSetahun, tanggal_bayar: setahunTanggal, metode: setahunMetode, keterangan: null, bukti_transfer: setahunMetode==="transfer"? setahunBukti: null, bulan_list: bulanList } } as any);
      setSuccess(`${selectedAnggotaSetahun.nama} — ${res.created} bulan dibayar lunas (${bulanList.map(b=>BULAN_NAMES[b].slice(0,3)).join(", ")}). ${res.skipped?.length? `Lewati sudah lunas: ${res.skipped.join(", ")}.`:""} Otomatis ✓ di checklist.`);
      if(periode && periode.tahun===tahunSetahun) await fetchStatus(periode.id);
      setSetahunOpen(false);
    } catch(e:unknown){
      const msg=errMsg(e);
      if(msg.includes("invoke")){
        // mock: anggap sukses
        setSuccess(`${selectedAnggotaSetahun.nama} — ${bulanList.length} bulan dibayar.`);
        setSetahunOpen(false);
      } else setError(msg);
    } finally { setSetahunLoading(false); }
  };

  const handleUpdateNominal = async () => {
    if (!periode) return;
    const n = parseInt(nominalEdit);
    if (!n || n <= 0) return setError("Nominal tidak valid");
    try {
      const updated = await invoke<Periode>("update_periode_nominal", { periode_id: periode.id, nominal_wajib: n } as any);
      setPeriode(updated);
      setSuccess(`Nominal periode diubah ke ${formatRupiah(n)} (hanya berlaku untuk pembayaran baru).`);
    } catch (e: unknown) {
      const msg = errMsg(e);
      if (msg.includes("invoke")) {
        setPeriode((p) => (p ? { ...p, nominal_wajib: n } : p));
        setSuccess(`(Mock) Nominal diubah ke ${formatRupiah(n)}`);
      } else setError(msg);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="h-6 w-6" /> Iuran Bulanan
        </h2>
        <p className="text-sm text-muted-foreground">Pilih periode, centang anggota yang bayar, lalu simpan massal — otomatis masuk kas.</p>
      </div>

      {error && <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-3 py-2 rounded-md">{error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-3 py-2 rounded-md">{success}</div>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Pilih Bulan & Tahun
          </CardTitle>
          <p className="text-xs text-muted-foreground -mt-2 px-6 pb-2">Pilih bulan dan tahun, lalu tampilkan daftar. Jika belum ada nama, tambah dulu di menu Anggota.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label>Bulan</Label>
              <select value={bulan} onChange={(e) => setBulan(parseInt(e.target.value))} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m} - {BULAN_NAMES[m]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Tahun</Label>
              <Input type="number" value={tahun} onChange={(e) => setTahun(parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-1">
              <Label>Jumlah Iuran per Bulan</Label>
              <Input type="number" value={nominalEdit} onChange={(e) => setNominalEdit(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={openPeriode} disabled={periodeLoading} className="w-full">
                {periodeLoading && <Loader2 className="h-4 w-4 animate-spin" />} Tampilkan Daftar
              </Button>
            </div>
          </div>
          {periode && (
            <div className="flex flex-wrap gap-2 items-center text-sm bg-muted/50 border rounded-md px-3 py-2">
              <span>
                Bulan yang dipilih: <strong>{BULAN_NAMES[periode.bulan]} {periode.tahun}</strong> • {formatRupiah(periode.nominal_wajib)} per orang
              </span>
              <Button variant="outline" size="sm" onClick={handleUpdateNominal} className="ml-auto">
                Simpan Jumlah Baru
              </Button>
            </div>
          )}
          {periodeList.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Bulan yang pernah dibuka:{" "}
              {periodeList.slice(0, 8).map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setBulan(p.bulan);
                    setTahun(p.tahun);
                    setNominalEdit(String(p.nominal_wajib));
                    // langsung buka
                    setTimeout(() => openPeriode(), 50);
                  }}
                  className="underline hover:text-foreground mr-2"
                >
                  {BULAN_NAMES[p.bulan].slice(0, 3)} {p.tahun}
                </button>
              ))}
            </div>
          )}

        </CardContent>
      </Card>

      {periode && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Total Anggota</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{statusList.length}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Sudah Lunas</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold text-emerald-600">{sudahBayar.length}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Belum Lunas</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold text-amber-600">{belumBayar.length}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">Uang Terkumpul</CardTitle>
              </CardHeader>
              <CardContent className="text-lg font-bold">{formatRupiah(sudahBayar.reduce((a, b) => a + (b.pembayaran?.nominal ?? 0), 0))}</CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={()=>setSetahunOpen(true)}>📅 Bayar Setahun (Cari Nama/NIP)</Button>
          </div>

          {/* Modal Bayar Setahun */}
          <Dialog open={setahunOpen} onOpenChange={setSetahunOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Bayar Iuran Setahun</DialogTitle>
                <DialogDescription>Ketik nama atau NIP, pilih anggota, lalu bayar Jan-Des sekaligus. Jika transfer wajib bukti 1 file untuk semua bulan.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label>Cari Anggota (nama / NIP) *</Label>
                  <Input placeholder="ketik Budi atau 1980..." value={searchAnggota} onChange={(e)=>setSearchAnggota(e.target.value)} />
                  {searchResults.length>0 && (
                    <div className="border rounded-md max-h-32 overflow-auto">
                      {searchResults.map(a=>(
                        <button key={a.id} onClick={()=>{ setSelectedAnggotaSetahun(a); setSearchAnggota(a.nama); setSearchResults([]); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${selectedAnggotaSetahun?.id===a.id?"bg-accent font-semibold":""}`}>
                          {a.nama} — {a.unit_kerja} {(a as any).nip_nuptk ? `• ${(a as any).nip_nuptk}`:""}
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedAnggotaSetahun && <div className="text-xs bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">Terpilih: <strong>{selectedAnggotaSetahun.nama}</strong> — {selectedAnggotaSetahun.unit_kerja}</div>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Tahun</Label><Input type="number" value={tahunSetahun} onChange={(e)=>setTahunSetahun(parseInt(e.target.value)||2026)} /></div>
                  <div className="space-y-1"><Label>Tanggal Bayar</Label><Input type="date" value={setahunTanggal} onChange={(e)=>setSetahunTanggal(e.target.value)} /></div>
                </div>
                <div className="space-y-1">
                  <Label>Metode</Label>
                  <select value={setahunMetode} onChange={(e)=>{ setSetahunMetode(e.target.value as any); if(e.target.value==="tunai"){ setSetahunBukti(null); setSetahunBuktiName(null);} }} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="tunai">Tunai</option>
                    <option value="transfer">Transfer (wajib bukti)</option>
                  </select>
                </div>
                {setahunMetode==="transfer" && (
                  <div className="space-y-1">
                    <Label>Bukti Transfer * (1 file untuk semua bulan)</Label>
                    <Input type="file" accept="image/*,.pdf" onChange={onSetahunBuktiChange} />
                    {setahunBuktiName && <div className="flex gap-2 items-center text-xs"><span>{setahunBuktiName}</span>{setahunBukti && <img src={setahunBukti} alt="preview" className="h-12 w-12 object-cover rounded border" />}</div>}
                  </div>
                )}
                <div className="space-y-1">
                  <Label>Pilih Bulan (centang yang mau dibayar)</Label>
                  <div className="grid grid-cols-4 gap-1">
                    {Array.from({length:12},(_,i)=>i+1).map(m=>{
                      const isPaid = paidMonthsSetahun.includes(m);
                      const checked = bulanChecks[m-1];
                      return (
                        <label key={m} className={`flex items-center gap-1 border rounded px-2 py-1 text-xs ${isPaid?"bg-muted opacity-60":""}`}>
                          <input type="checkbox" checked={checked} disabled={isPaid} onChange={(e)=> setBulanChecks(prev=>{ const n=[...prev]; n[m-1]=e.target.checked; return n; })} />
                          {BULAN_NAMES[m].slice(0,3)} {isPaid && <span className="text-emerald-600">✓ lunas</span>}
                        </label>
                      );
                    })}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" type="button" onClick={()=> setBulanChecks(Array(12).fill(true).map((_,i)=> !paidMonthsSetahun.includes(i+1)))}>Pilih Belum Lunas</Button>
                    <Button variant="ghost" size="sm" type="button" onClick={()=> setBulanChecks(Array(12).fill(false))}>Kosongkan</Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={()=>setSetahunOpen(false)} disabled={setahunLoading}>Batal</Button>
                <Button onClick={handleBayarSetahun} disabled={setahunLoading || !selectedAnggotaSetahun}>
                  {setahunLoading && <Loader2 className="h-4 w-4 animate-spin" />} Simpan {bulanChecks.filter(Boolean).length} Bulan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Daftar Anggota — {BULAN_NAMES[periode.bulan]} {periode.tahun}</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Cari nama..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Button variant="outline" size="sm" onClick={toggleAllBelum} disabled={belumBayar.length === 0}>
                  <CheckSquare className="h-4 w-4" /> {[...selected].length > 0 ? "Batal pilih" : "Pilih yang belum lunas"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tombol buka modal bayar — hemat tempat, ala KAS: pilih nama dulu baru modal input */}
              <div className="flex gap-2">
                <Button onClick={() => {
                  if(selected.size===0) setError("Centang minimal 1 anggota yang Belum Bayar dulu");
                  else setBayarOpen(true);
                }} disabled={selected.size===0} className="bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:opacity-90">
                  <CreditCard className="h-4 w-4" /> Bayar Terpilih ({selected.size}) • {formatRupiah(periode.nominal_wajib * selected.size)}
                </Button>
                <span className="text-xs text-muted-foreground self-center">Centang nama → Bayar → modal (tanggal/metode/bukti) → Simpan → auto ✓ Lunas</span>
              </div>

              <Dialog open={bayarOpen} onOpenChange={setBayarOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Bayar Iuran — {BULAN_NAMES[periode.bulan]} {periode.tahun}</DialogTitle>
                    <DialogDescription>
                      {selected.size} anggota terpilih • {formatRupiah(periode.nominal_wajib)}/orang • Total {formatRupiah(periode.nominal_wajib * selected.size)}
                      <div className="text-xs mt-1 max-h-16 overflow-auto bg-muted p-2 rounded">
                        {Array.from(selected).map(id=> filtered.find(f=>f.anggota.id===id)?.anggota.nama || statusList.find(s=>s.anggota.id===id)?.anggota.nama).filter(Boolean).join(", ")}
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label>Tanggal Bayar</Label>
                      <Input type="date" value={tanggalBayar} onChange={(e) => setTanggalBayar(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Metode</Label>
                      <select value={metode} onChange={(e) => { setMetode(e.target.value as any); if(e.target.value==="tunai"){ setBuktiPreview(null); setBuktiFileName(null);} }} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                        <option value="tunai">Tunai</option>
                        <option value="transfer">Transfer (wajib bukti)</option>
                      </select>
                    </div>
                    {metode === "transfer" && (
                      <div className="space-y-1">
                        <Label>Bukti Transfer <span className="text-destructive">*</span></Label>
                        <Input type="file" accept="image/*,.pdf" onChange={onBuktiChange} />
                        {buktiFileName && <div className="flex gap-2 items-center text-xs"><span className="truncate">{buktiFileName}</span>{buktiPreview && <img src={buktiPreview} alt="preview" className="h-12 w-12 object-cover rounded border" />}</div>}
                        <p className="text-xs text-muted-foreground">Budi transfer → upload foto → Simpan → otomatis ✓</p>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={()=>setBayarOpen(false)} disabled={bulkLoading}>Batal</Button>
                    <Button onClick={async()=>{ await handleBulkBayar(); if(!error) setBayarOpen(false); }} disabled={bulkLoading}>
                      {bulkLoading && <Loader2 className="h-4 w-4 animate-spin" />} Simpan Pembayaran
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {statusLoading ? (
                <div className="flex justify-center py-10 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat...
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <input type="checkbox" checked={filtered.length > 0 && filtered.filter((s) => !s.sudah_bayar).every((s) => selected.has(s.anggota.id))} onChange={toggleAllBelum} />
                        </TableHead>
                        <TableHead>Nama Anggota</TableHead>
                        <TableHead>Sekolah</TableHead>
                        <TableHead>Keterangan</TableHead>
                        <TableHead>Tanggal Bayar</TableHead>
                        <TableHead>Foto Bukti</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedFiltered.map((row) => (
                        <TableRow key={row.anggota.id} className={row.sudah_bayar ? "bg-emerald-50/50" : ""}>
                          <TableCell>
                            <input type="checkbox" disabled={row.sudah_bayar} checked={selected.has(row.anggota.id)} onChange={() => toggle(row.anggota.id)} />
                          </TableCell>
                          <TableCell className="font-medium">{row.anggota.nama}</TableCell>
                          <TableCell className="text-sm">{row.anggota.unit_kerja}</TableCell>
                          <TableCell>
                            {row.sudah_bayar ? <Badge className="bg-emerald-600">Sudah Lunas</Badge> : <Badge variant="destructive">Belum Lunas</Badge>}
                          </TableCell>
                          <TableCell className="text-xs">{row.pembayaran?.tanggal_bayar ?? "-"}</TableCell>
                          <TableCell>
                            {row.pembayaran?.bukti_transfer ? (
                              <button type="button" onClick={() => setBuktiView(row.pembayaran!.bukti_transfer!)} className="p-0 border rounded overflow-hidden hover:opacity-80">
                                <img src={row.pembayaran.bukti_transfer} alt="bukti" className="h-8 w-8 object-cover" title="Klik lihat bukti" />
                              </button>
                            ) : row.sudah_bayar ? <span className="text-xs text-muted-foreground">Tunai</span> : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.sudah_bayar && row.pembayaran ? (
                              <Button variant="ghost" size="sm" className="text-destructive h-7" onClick={() => handleBatal(row.pembayaran!.id)}>
                                Batalkan
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filtered.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                            {statusList.length === 0 ? "Belum ada anggota aktif. Tambah dulu di menu Anggota, lalu kembali ke sini & klik Buka Periode." : "Tidak ada data sesuai pencarian."}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                    </Table>
                </div>
              )}
              {filtered.length > 0 && <PaginationControls page={page} totalPages={totalPages} totalItems={filtered.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />}
              <Dialog open={!!buktiView} onOpenChange={(o) => !o && setBuktiView(null)}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader><DialogTitle>Bukti Transfer</DialogTitle></DialogHeader>
                  {buktiView && (
                    <div className="flex justify-center bg-muted p-2 rounded">
                      {buktiView.startsWith("data:application/pdf") ? <iframe src={buktiView} className="w-full h-[70vh] rounded border" title="bukti" /> : <img src={buktiView} alt="bukti besar" className="max-h-[70vh] max-w-full object-contain rounded border" />}
                    </div>
                  )}
                  <div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => setBuktiView(null)}>Tutup</Button></div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </>
      )}

    </div>
  );
}

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return JSON.stringify(e);
}
