import { useEffect, useState, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Trash2, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { saveXlsx } from "@/lib/fileSave";

type Riwayat = { id: number; waktu: string; username: string; aksi: string; detail: string | null };

export function Riwayat() {
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [aksi, setAksi] = useState("Semua");
  const [cari, setCari] = useState("");
  const [data, setData] = useState<Riwayat[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  useEffect(() => { setPage(1); }, [data.length, pageSize]);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const pagedData = useMemo(() => data.slice((page - 1) * pageSize, page * pageSize), [data, page, pageSize]);

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await invoke<Riwayat[]>("get_riwayat", { dari: dari || null, sampai: sampai || null, aksi: aksi === "Semua" ? null : aksi, cari: cari || null, limit: 200 } as any);
      setData(r);
    } catch (e: unknown) {
      const msg = String(e);
      if (msg.includes("invoke")) {
        setData([
          { id: 1, waktu: new Date().toISOString(), username: "admin", aksi: "Tambah Anggota", detail: "Budi Santoso — SDN 1" },
          { id: 2, waktu: new Date().toISOString(), username: "admin", aksi: "Bayar Iuran", detail: "Budi — Jan 2026 Tunai" },
          { id: 3, waktu: new Date().toISOString(), username: "bendahara", aksi: "Pengeluaran", detail: "Konsumsi 50.000 — Budi" },
        ]);
      }
    } finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const exportExcel = async () => {
    const rows = data.map((d) => ({ Waktu: d.waktu, Pengguna: d.username, Kegiatan: d.aksi, Rincian: d.detail ?? "-" }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Riwayat"); await saveXlsx(wb, `riwayat-${new Date().toISOString().slice(0,10)}.xlsx`);
  };
  const hapusLama = async () => {
    if (!confirm("Hapus riwayat lebih dari 6 bulan?")) return;
    await invoke("hapus_riwayat_lama"); fetch();
  };
  const hapusSemua = async () => {
    if (!confirm("Hapus SEMUA riwayat? Tidak bisa dikembalikan.")) return;
    if (prompt("Ketik HAPUS untuk konfirmasi") !== "HAPUS") return;
    await invoke("hapus_semua_riwayat"); fetch();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-white">Riwayat Kegiatan</h2>
        <p className="text-sm text-white/80">Siapa melakukan apa — tersimpan 6 bulan, lalu otomatis terhapus.</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Cari Riwayat</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <div className="space-y-1"><Label>Dari</Label><Input type="date" value={dari} onChange={(e) => setDari(e.target.value)} /></div>
            <div className="space-y-1"><Label>Sampai</Label><Input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} /></div>
            <div className="space-y-1"><Label>Kegiatan</Label>
              <select value={aksi} onChange={(e) => setAksi(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option>Semua</option><option>Tambah Anggota</option><option>Bayar Iuran</option><option>Pengeluaran</option><option>Masuk</option><option>Cadangkan Data</option><option>Pulihkan Data</option>
              </select>
            </div>
            <div className="space-y-1"><Label>Cari</Label><Input placeholder="nama pengguna / rincian..." value={cari} onChange={(e) => setCari(e.target.value)} /></div>
            <div className="flex items-end gap-1">
              <Button onClick={fetch} size="sm" className="flex-1"><Search className="h-4 w-4" /> Cari</Button>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={exportExcel} disabled={data.length===0}><Download className="h-4 w-4" /> Unduh Excel</Button>
            <Button variant="outline" size="sm" onClick={hapusLama}><Trash2 className="h-4 w-4" /> Hapus Lebih dari 6 Bulan</Button>
            <Button variant="destructive" size="sm" onClick={hapusSemua}><Trash2 className="h-4 w-4" /> Hapus Semua</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Hasil — {data.length} kegiatan</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div> :
            data.length===0 ? <p className="text-center text-sm text-muted-foreground py-8">Belum ada riwayat</p> :
            <div className="border rounded-md overflow-auto max-h-[60vh]">
              <Table>
                <TableHeader><TableRow><TableHead>Waktu</TableHead><TableHead>Pengguna</TableHead><TableHead>Kegiatan</TableHead><TableHead>Rincian</TableHead></TableRow></TableHeader>
                <TableBody>
                  {pagedData.map((r)=>(
                    <TableRow key={r.id}>
                      <TableCell className="text-xs whitespace-nowrap">{r.waktu.slice(0,19).replace("T"," ")}</TableCell>
                      <TableCell className="text-sm">@{r.username}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{r.aksi}</Badge></TableCell>
                      <TableCell className="text-sm max-w-[300px] truncate" title={r.detail ?? ""}>{r.detail ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          }
          {data.length > 0 && <PaginationControls page={page} totalPages={totalPages} totalItems={data.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />}
          {data.length > 0 && <p className="text-xs text-muted-foreground mt-1">Unduh Excel tetap pakai semua {data.length} baris (tidak terpotong halaman).</p>}
        </CardContent>
      </Card>
    </div>
  );
}
