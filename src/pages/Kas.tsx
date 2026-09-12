import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Wallet, ArrowDownCircle } from "lucide-react";
import { Transaksi } from "./Transaksi";
import { Iuran } from "./Iuran";
import { formatRupiah } from "@/lib/utils";

type Anggota = { id: number; nama: string; unit_kerja: string; nip_nuptk?: string | null };

const BULAN_NAMES = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export function Kas() {
  const [tab, setTab] = useState<"masuk" | "keluar">("masuk");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2 text-white"><Wallet className="h-6 w-6" /> Kas</h2>
        <p className="text-sm text-white/80">Kas masuk hanya dari iuran anggota — 1 form per anggota (1-12 bulan). Pengeluaran di tab terpisah.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant={tab === "masuk" ? "default" : "secondary"} size="sm" onClick={() => setTab("masuk")} className={tab === "masuk" ? "bg-white text-[#667eea] shadow" : "bg-white/20 text-white hover:bg-white/30"}>
          💰 Kas Masuk — Iuran Anggota
        </Button>
        <Button variant={tab === "keluar" ? "default" : "secondary"} size="sm" onClick={() => setTab("keluar")} className={tab === "keluar" ? "bg-white text-[#667eea] shadow" : "bg-white/20 text-white hover:bg-white/30"}>
          <ArrowDownCircle className="h-4 w-4" /> Pengeluaran
        </Button>
      </div>

      {tab === "masuk" && <KasMasukForm />}
      {tab === "keluar" && <Transaksi />}
    </div>
  );
}

function KasMasukForm() {
  const today = new Date().toISOString().slice(0, 10);
  const nowYear = new Date().getFullYear();
  const [tanggal, setTanggal] = useState(today);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Anggota[]>([]);
  const [selected, setSelected] = useState<Anggota | null>(null);
  const [tahun, setTahun] = useState(nowYear);
  const [bulanChecks, setBulanChecks] = useState<boolean[]>(Array(12).fill(true));
  const [paidMonths, setPaidMonths] = useState<number[]>([]);
  const [metode, setMetode] = useState<"tunai" | "transfer">("tunai");
  const [bukti, setBukti] = useState<string | null>(null);
  const [buktiName, setBuktiName] = useState<string | null>(null);
  const [keterangan, setKeterangan] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // cari nama/NIP — ketik untuk mencari
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!search.trim()) { setResults([]); return; }
      try {
        const r = await invoke<Anggota[]>("get_anggota", { search, statusAktif: true } as any);
        setResults(r.slice(0, 8));
      } catch { setResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPaid = async (anggotaId: number, th: number) => {
    try {
      const matrix = await invoke<{ id: number; paid: number[] }[]>("get_checklist_matrix", { tahun: th } as any);
      const found = matrix.find((m) => m.id === anggotaId);
      const paid = found?.paid || [];
      setPaidMonths(paid);
      setBulanChecks(Array.from({ length: 12 }, (_, i) => !paid.includes(i + 1)));
    } catch {
      setPaidMonths([]);
      setBulanChecks(Array(12).fill(true));
    }
  };
  useEffect(() => { if (selected) fetchPaid(selected.id, tahun); }, [selected, tahun]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) { setBukti(null); setBuktiName(null); return; }
    if (f.size > 3 * 1024 * 1024) { setMsg({ type: "err", text: "Bukti maksimal 3MB" }); return; }
    setBuktiName(f.name);
    const r = new FileReader(); r.onload = () => setBukti(r.result as string); r.readAsDataURL(f);
  };

  const simpan = async () => {
    setMsg(null);
    if (!selected) { setMsg({ type: "err", text: "Ketik nama/NIP lalu pilih anggota dulu" }); return; }
    const bulanList = bulanChecks.map((c, i) => (c ? i + 1 : null)).filter(Boolean) as number[];
    if (bulanList.length === 0) { setMsg({ type: "err", text: "Centang minimal 1 bulan" }); return; }
    if (metode === "transfer" && !bukti) { setMsg({ type: "err", text: "Wajib upload bukti untuk transfer" }); return; }
    setLoading(true);
    try {
      const res = await invoke<{ created: number; skipped: number[] }>("bayar_iuran_setahun", {
        input: {
          anggota_id: selected.id,
          tahun,
          tanggal_bayar: tanggal,
          metode,
          keterangan: keterangan || null,
          bukti_transfer: metode === "transfer" ? bukti : null,
          bulan_list: bulanList,
        },
      } as any);
      setMsg({ type: "ok", text: `✅ ${selected.nama} — ${res.created} bulan dibayar (${bulanList.map((b) => BULAN_NAMES[b].slice(0, 3)).join(", ")}) ${tahun}. ${res.skipped?.length ? `Sudah lunas dilewati: ${res.skipped.join(", ")}.` : ""} Otomatis ✓ & kas masuk.` });
      fetchPaid(selected.id, tahun);
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      if (m.includes("invoke")) setMsg({ type: "ok", text: `(Mock) ${selected?.nama} — ${bulanList.length} bulan tersimpan` });
      else setMsg({ type: "err", text: m });
    } finally { setLoading(false); }
  };

  const totalNominal = 10000 * bulanChecks.filter(Boolean).length; // default, Rust pakai per-periode nominal_wajib
  const [bulkEnabled, setBulkEnabled] = useState(() => localStorage.getItem("kas_bulk_enabled") === "1");
  useEffect(() => {
    const h = () => setBulkEnabled(localStorage.getItem("kas_bulk_enabled") === "1");
    window.addEventListener("kas_bulk_changed", h);
    window.addEventListener("storage", h);
    return () => { window.removeEventListener("kas_bulk_changed", h); window.removeEventListener("storage", h); };
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">💰 Form Iuran Anggota</CardTitle>
          <p className="text-xs text-muted-foreground">Cari nama anggota, pilih bulan yang mau dibayar, lalu simpan. Pilih metode transfer wajib upload foto bukti.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1 relative md:col-span-2">
              <Label>Cari Nama Anggota *</Label>
              <Input placeholder="ketik nama atau NIP..." value={search} onChange={(e) => { setSearch(e.target.value); setSelected(null); }} />
              {results.length > 0 && (
                <div className="absolute z-10 w-full bg-white border rounded-md shadow max-h-36 overflow-auto mt-1">
                  {results.map((a) => (
                    <button key={a.id} onClick={() => { setSelected(a); setSearch(a.nama); setResults([]); }} className="w-full text-left px-3 py-2 text-sm hover:bg-accent">
                      {a.nama} — {a.unit_kerja} {a.nip_nuptk ? `• ${a.nip_nuptk}` : ""}
                    </button>
                  ))}
                </div>
              )}
              {selected && <div className="text-xs bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">Terpilih: <strong>{selected.nama}</strong> — {selected.unit_kerja}</div>}
            </div>

            <div className="space-y-1">
              <Label>Tahun Bayar</Label>
              <Input type="number" value={tahun} onChange={(e) => setTahun(parseInt(e.target.value) || nowYear)} />
            </div>
            <div className="space-y-1">
              <Label>Tanggal Bayar</Label>
              <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Cara Bayar</Label>
              <select value={metode} onChange={(e) => { setMetode(e.target.value as any); if (e.target.value === "tunai") { setBukti(null); setBuktiName(null); } }} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="tunai">Tunai / Cash</option>
                <option value="transfer">Transfer (wajib foto bukti)</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Catatan (boleh kosong)</Label>
              <Input placeholder="mis. transfer BCA a.n. Budi" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} />
            </div>
            {metode === "transfer" && (
              <div className="space-y-1 md:col-span-2">
                <Label>Foto Bukti Transfer *</Label>
                <Input type="file" accept="image/*,.pdf" onChange={onFile} />
                {buktiName && <div className="flex gap-2 items-center text-xs"><span>{buktiName}</span>{bukti && <img src={bukti} alt="preview" className="h-12 w-12 object-cover rounded border" />}</div>}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label>Pilih Bulan yang Dibayar *</Label>
            <p className="text-xs text-muted-foreground">Centang bulan yang mau dibayar. Yang sudah lunas tidak bisa dipilih lagi dan ada tanda ✓ hijau.</p>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-1">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const isPaid = paidMonths.includes(m);
                const checked = bulanChecks[m - 1];
                return (
                  <label key={m} className={`flex items-center gap-1 border rounded px-2 py-2 text-xs ${isPaid ? "bg-muted opacity-60" : checked ? "bg-emerald-50 border-emerald-300" : ""}`}>
                    <input type="checkbox" checked={checked} disabled={isPaid} onChange={(e) => setBulanChecks((prev) => { const n = [...prev]; n[m - 1] = e.target.checked; return n; })} />
                    {BULAN_NAMES[m]} {isPaid && <span className="text-emerald-600">✓ lunas</span>}
                  </label>
                );
              })}
            </div>
            <div className="flex gap-1 flex-wrap">
              <Button variant="outline" size="sm" type="button" onClick={() => setBulanChecks(Array.from({ length: 12 }, (_, i) => !paidMonths.includes(i + 1)))}>Pilih yang Belum Bayar</Button>
              <Button variant="ghost" size="sm" type="button" onClick={() => setBulanChecks(Array(12).fill(false))}>Hapus Semua Pilihan</Button>
              <span className="text-xs text-muted-foreground self-center ml-2">Total yang dibayar: {formatRupiah(totalNominal)} ({bulanChecks.filter(Boolean).length} bulan)</span>
            </div>
          </div>

          {msg && <div className={`text-sm px-3 py-2 rounded-md border ${msg.type === "ok" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-destructive/10 border-destructive/20 text-destructive"}`}>{msg.text}</div>}

          <Button onClick={simpan} disabled={loading || !selected} className="w-full bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:opacity-90">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} 💾 Simpan — {selected ? selected.nama : "Pilih anggota"} ({bulanChecks.filter(Boolean).length} bulan)
          </Button>

          <div className="border rounded-md p-3 bg-muted/20">
            <div className="text-sm font-medium">Bayar Rame-rame (untuk rapat)</div>
            <p className="text-xs text-muted-foreground mt-1">Jika banyak anggota bayar bersamaan dalam 1 bulan (mis. rapat), aktifkan fitur ini di <strong>Pengaturan → Bayar Rame-rame</strong>.</p>
            {bulkEnabled ? (
              <div className="mt-3 border-t pt-3">
                <div className="text-xs font-medium text-emerald-700 mb-2">✅ Fitur bayar rame-rame aktif:</div>
                <Iuran />
              </div>
            ) : (
              <div className="mt-2 text-xs text-muted-foreground">Saat ini hanya tampil form per orang di atas. Aktifkan di Pengaturan jika butuh bayar rame-rame.</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Cara Pakai</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <div>• Cari nama, pilih bulan yang mau dibayar, pilih cara bayar. Jika transfer wajib foto bukti, lalu Simpan.</div>
          <div>• Yang sudah dibayar akan ada tanda ✓ hijau dan tidak bisa dipilih lagi.</div>
          <div>• Uang keluar (belanja, transport) ada di tab Pengeluaran.</div>
        </CardContent>
      </Card>
    </div>
  );
}
