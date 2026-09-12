import { useState, useEffect, useMemo } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatRupiah } from "@/lib/utils";
import { Loader2, FileSpreadsheet, FileText, Search } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type KasView = {
  id: number;
  tipe: string;
  kategori_nama: string | null;
  nominal: number;
  tanggal: string;
  keterangan: string;
  penanggung_jawab: string | null;
  bukti?: string | null;
};

export function Laporan() {
  const today = new Date().toISOString().slice(0, 10);
  const firstDay = today.slice(0, 8) + "01";
  const [dari, setDari] = useState(firstDay);
  const [sampai, setSampai] = useState(today);
  const [tipe, setTipe] = useState<"all" | "masuk" | "keluar">("all");
  const [data, setData] = useState<KasView[]>([]);
  const [loading, setLoading] = useState(false);
  const [_error, setError] = useState<string | null>(null);
  void _error;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  useEffect(() => { setPage(1); }, [data.length, pageSize]);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const pagedData = useMemo(() => data.slice((page - 1) * pageSize, page * pageSize), [data, page, pageSize]);
  const [buktiView, setBuktiView] = useState<string | null>(null);
  const [includeBukti, setIncludeBukti] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await invoke<KasView[]>("get_kas_transaksi", {
        tipe: tipe === "all" ? null : tipe,
        kategoriId: null,
        dari: dari || null,
        sampai: sampai || null,
        limit: 1000,
      } as any);
      setData(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("invoke")) {
        setData([
          {
            id: 1,
            tipe: "masuk",
            kategori_nama: "Iuran Anggota",
            nominal: 300000,
            tanggal: dari,
            keterangan: "Iuran Jan - 30 anggota",
            penanggung_jawab: null,
          },
          {
            id: 2,
            tipe: "keluar",
            kategori_nama: "Konsumsi",
            nominal: 150000,
            tanggal: dari,
            keterangan: "Konsumsi rapat",
            penanggung_jawab: "Budi Santoso",
          },
          {
            id: 3,
            tipe: "keluar",
            kategori_nama: "ATK",
            nominal: 50000,
            tanggal: sampai,
            keterangan: "Fotokopi",
            penanggung_jawab: null,
          },
        ]);
      } else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const totalMasuk = data
    .filter((d) => d.tipe === "masuk")
    .reduce((a, b) => a + b.nominal, 0);
  const totalKeluar = data
    .filter((d) => d.tipe === "keluar")
    .reduce((a, b) => a + b.nominal, 0);

  const fetchProfil = async (): Promise<any> => {
    try {
      return await invoke("get_profil");
    } catch {
      return null;
    }
  };

  const exportExcel = async () => {
    const profil = await fetchProfil();
    const namaForum = profil?.nama_forum || "Forum PPPK";
    const alamat = profil?.alamat || "";
    // kop rows
    const kop = [[namaForum], [alamat], [`Laporan Kas — Periode ${dari} s/d ${sampai} | Filter: ${tipe}`], []];
    const header = ["No", "Tanggal", "Tipe", "Kategori", "Keterangan", "Penanggung Jawab", "Nominal"];
    const body = data.map((d, i) => [i + 1, d.tanggal, d.tipe, d.kategori_nama ?? "-", d.keterangan, d.penanggung_jawab ?? "-", d.nominal]);
    const foot = [
      ["", "", "", "", "", "Total Masuk", totalMasuk],
      ["", "", "", "", "", "Total Keluar", totalKeluar],
      ["", "", "", "", "", "Saldo", totalMasuk - totalKeluar],
    ];
    const ttd = [
      [],
      ["", "Ketua", "", "Sekretaris", "", "Bendahara"],
      ["", profil?.ketua_nama || "___________________", "", profil?.sekretaris_nama || "___________________", "", profil?.bendahara_nama || "___________________"],
      ["", profil?.ketua_nip ? `NIP. ${profil.ketua_nip}` : "", "", profil?.sekretaris_nip ? `NIP. ${profil.sekretaris_nip}` : "", "", profil?.bendahara_nip ? `NIP. ${profil.bendahara_nip}` : ""],
    ];
    const all = [...kop, header, ...body, ...foot, ...ttd];
    const ws = XLSX.utils.aoa_to_sheet(all);
    ws["!cols"] = [{ wch: 4 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 28 }, { wch: 18 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan");
    XLSX.writeFile(wb, `laporan-kas-${dari}_sd_${sampai}.xlsx`);
  };

  const exportPDF = async () => {
    const profil = await fetchProfil();
    const namaForum = profil?.nama_forum || "Forum PPPK";
    const alamat = profil?.alamat || "";
    const doc = new jsPDF();
    // logo if exists
    if (profil?.logo_base64) {
      try {
        // detect png vs jpeg
        const isPng = profil.logo_base64.includes("image/png");
        doc.addImage(profil.logo_base64, isPng ? "PNG" : "JPEG", 14, 6, 14, 14);
      } catch {}
    }
    const xOffset = profil?.logo_base64 ? 32 : 14;
    doc.setFontSize(14);
    doc.text(namaForum, xOffset, 14);
    doc.setFontSize(8);
    if (alamat) doc.text(alamat, xOffset, 18);
    doc.setFontSize(9);
    doc.text(
      `Laporan Kas — Periode: ${dari} s/d ${sampai}  |  Filter: ${tipe}  |  Dicetak: ${today}`,
      14,
      24,
    );
    autoTable(doc, {
      startY: 28,
      head: [
        ["No", "Tanggal", "Tipe", "Kategori", "Keterangan", "PJ", "Nominal"],
      ],
      body: data.map((d, i) => [
        String(i + 1),
        d.tanggal,
        d.tipe,
        d.kategori_nama ?? "-",
        d.keterangan,
        d.penanggung_jawab ?? "-",
        formatRupiah(d.nominal),
      ]),
      foot: [
        ["", "", "", "", "", "Total Masuk", formatRupiah(totalMasuk)],
        ["", "", "", "", "", "Total Keluar", formatRupiah(totalKeluar)],
        ["", "", "", "", "", "Saldo", formatRupiah(totalMasuk - totalKeluar)],
      ],
      styles: { fontSize: 7 },
      headStyles: { fillColor: [30, 41, 59] },
    });
    // ttd 3 kolom
    const finalY = (doc as any).lastAutoTable?.finalY || 100;
    const y = finalY + 14;
    doc.setFontSize(8);
    const ketua = profil?.ketua_nama || "___________________";
    const ketuaNip = profil?.ketua_nip ? `NIP. ${profil.ketua_nip}` : "";
    const sek = profil?.sekretaris_nama || "___________________";
    const sekNip = profil?.sekretaris_nip ? `NIP. ${profil.sekretaris_nip}` : "";
    const ben = profil?.bendahara_nama || "___________________";
    const benNip = profil?.bendahara_nip ? `NIP. ${profil.bendahara_nip}` : "";
    doc.text("Mengetahui,", 14, y);
    doc.text("Mengetahui,", 80, y);
    doc.text("Mengetahui,", 145, y);
    doc.text("Ketua", 14, y + 5);
    doc.text("Sekretaris", 80, y + 5);
    doc.text("Bendahara", 145, y + 5);
    doc.text(ketua, 14, y + 22);
    if (ketuaNip) doc.text(ketuaNip, 14, y + 26);
    doc.text(sek, 80, y + 22);
    if (sekNip) doc.text(sekNip, 80, y + 26);
    doc.text(ben, 145, y + 22);
    if (benNip) doc.text(benNip, 145, y + 26);
    doc.setFontSize(6);
    doc.text("Tanda tangan & stempel", 14, y + 18);
    doc.text("Tanda tangan & stempel", 80, y + 18);
    doc.text("Tanda tangan & stempel", 145, y + 18);

    // Lampiran bukti (hanya jika dicentang)
    if (includeBukti) {
      const withBukti = data.filter((d) => d.bukti);
      if (withBukti.length > 0) {
        if (withBukti.length > 30 && !confirm(`Ada ${withBukti.length} bukti — PDF akan besar. Lanjutkan?`)) {
          // skip appendix
        } else {
          doc.addPage();
          doc.setFontSize(12);
          doc.text("Lampiran Bukti", 14, 14);
          doc.setFontSize(7);
          doc.text(`Periode ${dari} s/d ${sampai} — ${withBukti.length} bukti terlampir`, 14, 18);
          let curY = 22;
          const pageH = doc.internal.pageSize.getHeight();
          for (let idx = 0; idx < withBukti.length; idx++) {
            const d = withBukti[idx];
            const isPdf = d.bukti!.startsWith("data:application/pdf");
            const blockH = isPdf ? 22 : 62;
            if (curY + blockH > pageH - 10) {
              doc.addPage();
              curY = 14;
            }
            doc.setFontSize(7);
            (doc as any).setFont(undefined as any, "bold");
            doc.text(`${idx + 1}. ${d.tanggal} • ${d.kategori_nama ?? "-"} • ${d.keterangan.slice(0, 60)} • ${formatRupiah(d.nominal)}${d.penanggung_jawab ? ` • ${d.penanggung_jawab}` : ""}`, 14, curY);
            (doc as any).setFont(undefined as any, "normal");
            curY += 4;
            if (isPdf) {
              doc.setFontSize(6);
              doc.text("[Bukti PDF — lihat di aplikasi / unduh terpisah]", 14, curY);
              curY += 8;
            } else {
              try {
                const fmt = d.bukti!.includes("image/png") ? "PNG" : "JPEG";
                doc.addImage(d.bukti!, fmt, 14, curY, 90, 55);
                curY += 58;
              } catch {
                doc.setFontSize(6);
                doc.text("[Gagal render gambar]", 14, curY);
                curY += 6;
              }
            }
            doc.setDrawColor(200);
            doc.line(14, curY, 196, curY);
            curY += 4;
          }
        }
      }
    }

    doc.save(`laporan-kas-${dari}_sd_${sampai}.pdf`);
  };

  const exportCSV = () => {
    const header =
      "tanggal,tipe,kategori,keterangan,penanggung_jawab,nominal\n";
    const rows = data
      .map(
        (d) =>
          `${d.tanggal},${d.tipe},"${d.kategori_nama ?? ""}","${d.keterangan.replace(/"/g, '""')}","${(d.penanggung_jawab ?? "").replace(/"/g, '""')}",${d.nominal}`,
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-kas-${dari}_sd_${sampai}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-white">Laporan Keuangan</h2>
        <p className="text-sm text-white/80">
          Lihat ringkasan uang masuk dan keluar, lalu unduh sebagai file Excel
          atau PDF.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pilih Tanggal Laporan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label>Dari</Label>
              <Input
                type="date"
                value={dari}
                onChange={(e) => setDari(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Sampai</Label>
              <Input
                type="date"
                value={sampai}
                onChange={(e) => setSampai(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Jenis</Label>
              <select
                value={tipe}
                onChange={(e) => setTipe(e.target.value as any)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="all">Semua (Masuk & Keluar)</option>
                <option value="masuk">Hanya Uang Masuk</option>
                <option value="keluar">Hanya Uang Keluar</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={fetchData} className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}{" "}
                Tampilkan
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="border rounded-md p-3">
              <div className="text-xs text-muted-foreground">
                Jumlah Uang Masuk
              </div>
              <div className="font-bold text-emerald-600">
                {formatRupiah(totalMasuk)}
              </div>
            </div>
            <div className="border rounded-md p-3">
              <div className="text-xs text-muted-foreground">
                Jumlah Uang Keluar
              </div>
              <div className="font-bold text-destructive">
                {formatRupiah(totalKeluar)}
              </div>
            </div>
            <div className="border rounded-md p-3 bg-muted/50">
              <div className="text-xs text-muted-foreground">
                Sisa di Periode Ini
              </div>
              <div className="font-bold">
                {formatRupiah(totalMasuk - totalKeluar)}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={exportExcel}
              disabled={data.length === 0}
            >
              <FileSpreadsheet className="h-4 w-4" /> Unduh Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportPDF}
              disabled={data.length === 0}
            >
              <FileText className="h-4 w-4" /> Unduh PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              disabled={data.length === 0}
            >
              Unduh CSV
            </Button>
            <label className="flex items-center gap-1.5 text-xs border rounded px-2 py-1.5 cursor-pointer ml-1">
              <input type="checkbox" checked={includeBukti} onChange={(e) => setIncludeBukti(e.target.checked)} className="h-3.5 w-3.5" />
              Sertakan lampiran bukti di PDF
            </label>
            {includeBukti && data.filter((d) => d.bukti).length > 0 && (
              <span className="text-xs text-muted-foreground">({data.filter((d) => d.bukti).length} bukti)</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            File Excel bisa dibuka di HP/komputer. File PDF siap cetak.{includeBukti ? " Jika dicentang, halaman lampiran bukti akan ditambahkan di akhir PDF." : ""}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Hasil ({data.length} transaksi)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Belum ada data. Atur filter lalu klik Tampilkan.
            </p>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Keperluan</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead>Petugas</TableHead>
                    <TableHead>Bukti</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedData.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="text-xs">{d.tanggal}</TableCell>
                      <TableCell>
                        {d.tipe === "masuk" ? (
                          <Badge className="bg-emerald-600">Masuk</Badge>
                        ) : (
                          <Badge variant="destructive">Keluar</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {d.kategori_nama ?? "-"}
                      </TableCell>
                      <TableCell
                        className="text-sm max-w-[200px] truncate"
                        title={d.keterangan}
                      >
                        {d.keterangan}
                      </TableCell>
                      <TableCell className="text-xs">
                        {d.penanggung_jawab ? (
                          <span className="bg-blue-50 border px-1.5 py-0.5 rounded-full">
                            {d.penanggung_jawab}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {d.bukti ? (
                          <button type="button" onClick={() => setBuktiView(d.bukti!)} className="p-0 border rounded overflow-hidden hover:opacity-80">
                            <img src={d.bukti} alt="bukti" className="h-8 w-8 object-cover" title="Klik lihat bukti" />
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${d.tipe === "masuk" ? "text-emerald-600" : "text-destructive"}`}
                      >
                        {d.tipe === "masuk" ? "+" : "-"}{" "}
                        {formatRupiah(d.nominal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {data.length > 0 && <PaginationControls page={page} totalPages={totalPages} totalItems={data.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />}
          {data.length > 0 && <p className="text-xs text-muted-foreground mt-2">Cetak/Excel/PDF tetap pakai semua {data.length} baris (tidak terpotong halaman).</p>}
          <Dialog open={!!buktiView} onOpenChange={(o) => !o && setBuktiView(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Bukti Transaksi</DialogTitle></DialogHeader>
              {buktiView && <div className="flex justify-center bg-muted p-2 rounded">{buktiView.startsWith("data:application/pdf") ? <iframe src={buktiView} className="w-full h-[70vh] rounded border" title="bukti" /> : <img src={buktiView} alt="bukti besar" className="max-h-[70vh] max-w-full object-contain rounded border" />}</div>}
              <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => setBuktiView(null)}>Tutup</Button></div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
