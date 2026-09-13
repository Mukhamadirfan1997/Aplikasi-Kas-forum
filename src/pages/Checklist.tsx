import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer, Download, RefreshCw, Loader2 } from "lucide-react";
import { PaginationControls } from "@/components/ui/pagination-controls";
import * as XLSX from "xlsx";
import { saveXlsx } from "@/lib/fileSave";
import { checklistFileName } from "@/lib/fileName";

type CheckRow = {
  id: number;
  nama: string;
  unit_kerja: string;
  paid: number[];
};

const BULAN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agt",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

export function Checklist() {
  const nowYear = new Date().getFullYear();
  const [tahun, setTahun] = useState(nowYear);
  const [data, setData] = useState<CheckRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await invoke<CheckRow[]>("get_checklist_matrix", {
        tahun,
      } as any);
      setData(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("invoke")) {
        setData([
          {
            id: 1,
            nama: "Budi Santoso",
            unit_kerja: "SDN 1 Rejoso",
            paid: [1, 2, 5, 9],
          },
          {
            id: 2,
            nama: "Siti Aminah",
            unit_kerja: "SDN 2 Rejoso",
            paid: [1, 2, 3, 4, 5, 6, 7, 8, 9],
          },
          { id: 3, nama: "Ahmad Fauzi", unit_kerja: "SDN 3 Rejoso", paid: [] },
          {
            id: 4,
            nama: "Dewi Rahayu",
            unit_kerja: "SDN 4 Rejoso",
            paid: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tahun]);

  const filtered = search.trim()
    ? data.filter(
        (d) =>
          d.nama.toLowerCase().includes(search.toLowerCase()) ||
          d.unit_kerja.toLowerCase().includes(search.toLowerCase()),
      )
    : data;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  useEffect(() => { setPage(1); }, [search, tahun, pageSize]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedFiltered = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);

  // Statistik ringkasan per bulan
  const perBulan = Array.from({ length: 12 }, (_, i) => ({
    sudah: data.filter((r) => r.paid.includes(i + 1)).length,
    total: data.length,
  }));
  const totalLunas = data.filter((r) => r.paid.length === 12).length;

  // ── CETAK ──
  const handlePrint = async () => {
    const esc = (s: string) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    let profil: any = null;
    try {
      profil = await invoke("get_profil");
    } catch {
      profil = null;
    }
    const namaForum = esc(profil?.nama_forum || "Forum PPPK");
    const alamat = esc(profil?.alamat || "");
    const ketuaNama = esc(profil?.ketua_nama || "");
    const ketuaNip = esc(profil?.ketua_nip || "");
    const sekNama = esc(profil?.sekretaris_nama || "");
    const sekNip = esc(profil?.sekretaris_nip || "");
    const benNama = esc(profil?.bendahara_nama || "");
    const benNip = esc(profil?.bendahara_nip || "");
    const logoHtml = profil?.logo_base64 ? `<img src="${profil.logo_base64}" style="height:42px;object-fit:contain;margin-right:10px;" />` : "";

    const tableRows = filtered
      .map(
        (r, idx) =>
          `<tr>
        <td>${idx + 1}</td>
        <td class="col-nama">${esc(r.nama)}<br/><small>${esc(r.unit_kerja)}</small></td>
        ${Array.from(
          { length: 12 },
          (_, i) =>
            `<td>${
              r.paid.includes(i + 1)
                ? '<span class="lunas">&#10003;</span>'
                : '<span class="kosong">&mdash;</span>'
            }</td>`,
        ).join("")}
        <td class="${r.paid.length === 12 ? "lunas" : r.paid.length === 0 ? "nol" : "sebagian"}">${r.paid.length}/12</td>
      </tr>`,
      )
      .join("");

    const html = `<!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <title>Daftar Iuran ${tahun} — ${namaForum}</title>
      <style>
        @page { size: A4 landscape; margin: 10mm 8mm; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 9.5px; color: #111; margin: 0; }
        .kop { display:flex; align-items:center; gap:8px; margin-bottom:2px; border-bottom:2px solid #222; padding-bottom:6px; }
        .kop-text h2 { margin:0; font-size:13px; }
        .kop-text .addr { font-size:9px; color:#444; }
        .sub { margin: 4px 0 6px; font-size: 9px; color: #555; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #aaa; padding: 3px 4px; text-align: center; white-space: nowrap; }
        th { background: #e8edf3; font-weight: bold; font-size: 9px; }
        .col-nama { text-align: left; min-width: 110px; white-space: normal; }
        .col-nama small { color: #555; font-size: 8px; display: block; }
        .lunas { color: #16a34a; font-weight: bold; }
        .nol { color: #dc2626; }
        .sebagian { color: #d97706; }
        .kosong { color: #bbb; }
        .summary { margin-bottom: 5px; display: flex; gap: 16px; font-size: 9px; }
        .summary span { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
        .footer { margin-top: 6px; font-size: 8px; color: #777; }
        .ttd { margin-top: 18px; display: flex; justify-content: space-between; font-size: 9px; gap:12px; }
        .ttd-inner { text-align: center; flex:1; }
        .ttd-line { margin: 36px auto 2px; border-top: 1px solid #333; width: 130px; }
        .ttd small { color:#555; font-size:7.5px; display:block; }
      </style>
    </head><body>
      <div class="kop">${logoHtml}<div class="kop-text"><h2>${namaForum} &mdash; Daftar Iuran Tahun ${tahun}</h2>${alamat ? `<div class="addr">${alamat}</div>` : ``}</div></div>
      <div class="sub">Dicetak: ${new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
      <div class="summary">
        <span>Total Anggota: <strong>${data.length}</strong></span>
        <span>Lunas 12 Bulan: <strong style="color:#16a34a">${totalLunas}</strong></span>
        <span>Bayar Sebagian: <strong style="color:#d97706">${data.filter((r) => r.paid.length > 0 && r.paid.length < 12).length}</strong></span>
        <span>Belum Bayar: <strong style="color:#dc2626">${data.filter((r) => r.paid.length === 0).length}</strong></span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="min-width:28px">No</th>
            <th class="col-nama">Nama Anggota</th>
            ${BULAN.map((b) => `<th>${b}</th>`).join("")}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
      <div class="ttd">
        <div class="ttd-inner">Mengetahui,<br/>Ketua<br/><br/><br/><div class="ttd-line"></div><strong>${ketuaNama || "___________________"}</strong>${ketuaNip ? `<small>NIP. ${ketuaNip}</small>` : `<small>&nbsp;</small>`}</div>
        <div class="ttd-inner">Mengetahui,<br/>Sekretaris<br/><br/><br/><div class="ttd-line"></div><strong>${sekNama || "___________________"}</strong>${sekNip ? `<small>NIP. ${sekNip}</small>` : `<small>&nbsp;</small>`}</div>
        <div class="ttd-inner">Mengetahui,<br/>Bendahara<br/><br/><br/><div class="ttd-line"></div><strong>${benNama || "___________________"}</strong>${benNip ? `<small>NIP. ${benNip}</small>` : `<small>&nbsp;</small>`}</div>
      </div>
      <div class="footer">
        &#10003; hijau = sudah bayar &nbsp;|&nbsp; &mdash; = belum bayar &nbsp;|&nbsp; Dicetak otomatis oleh ${namaForum}
      </div>
    </body></html>`;

     // Tauri WebView blokir window.open — pakai iframe hidden (work di browser & Tauri)
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const iDoc = iframe.contentWindow?.document;
    if (!iDoc) {
      // fallback ekstrem: simpan HTML via dialog — nama otomatis tapi tetap bisa rename
      try {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { writeTextFile } = await import("@tauri-apps/plugin-fs");
        const htmlName = checklistFileName(profil?.nama_forum || "Forum PPPK", tahun, "html");
        const p = await save({ defaultPath: htmlName, filters: [{ name: "HTML", extensions: ["html"] }] });
        if (p) { await writeTextFile(p, html); alert(`HTML disimpan di ${p} — buka di browser lalu Cetak (Ctrl+P).`); }
      } catch { alert("Gagal membuka cetak. Coba lagi."); }
      iframe.remove();
      return;
    }
    iDoc.open();
    iDoc.write(html);
    iDoc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 1000);
    }, 300);
  };

  // ── EXPORT EXCEL ──
  const handleExcel = async () => {
    let profil: any = null;
    try {
      profil = await invoke("get_profil");
    } catch {
      profil = null;
    }
    const namaForum = profil?.nama_forum || "Forum PPPK";
    const alamat = profil?.alamat || "";
    const kopRows: any[][] = [[namaForum], [alamat], [`Daftar Iuran Tahun ${tahun}`], []];
    const header = [
      "No",
      "Nama Anggota",
      "Unit Kerja",
      ...BULAN,
      "Total Bulan Bayar",
    ];
    const rows = filtered.map((r, idx) => [
      idx + 1,
      r.nama,
      r.unit_kerja,
      ...Array.from({ length: 12 }, (_, i) =>
        r.paid.includes(i + 1) ? "✓" : "",
      ),
      r.paid.length,
    ]);
    const ttdRows: any[][] = [
      [],
      ["", "", "Ketua", "", "Sekretaris", "", "Bendahara"],
      ["", "", profil?.ketua_nama || "___________________", "", profil?.sekretaris_nama || "___________________", "", profil?.bendahara_nama || "___________________"],
      ["", "", profil?.ketua_nip ? `NIP. ${profil.ketua_nip}` : "", "", profil?.sekretaris_nip ? `NIP. ${profil.sekretaris_nip}` : "", "", profil?.bendahara_nip ? `NIP. ${profil.bendahara_nip}` : ""],
    ];
    const allRows = [...kopRows, header, ...rows, ...ttdRows];
    const ws = XLSX.utils.aoa_to_sheet(allRows);
    ws["!cols"] = [
      { wch: 4 },
      { wch: 26 },
      { wch: 22 },
      ...Array(12).fill({ wch: 6 }),
      { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Iuran ${tahun}`);
    await saveXlsx(wb, checklistFileName(namaForum, tahun, "xlsx"));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            📋 Daftar Iuran Tahunan
          </h2>
          <p className="text-sm text-white/80">
            ✓ hijau = sudah bayar. Bisa dicetak (A4 landscape) atau diunduh
            Excel.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            disabled={loading || data.length === 0}
            className="bg-white text-[#667eea]"
          >
            <Printer className="h-4 w-4" /> Cetak
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExcel}
            disabled={loading || data.length === 0}
            className="bg-white text-[#667eea]"
          >
            <Download className="h-4 w-4" /> Unduh Excel
          </Button>
        </div>
      </div>

      {/* Kartu Ringkasan */}
      {data.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Total Anggota",
              value: data.length,
              color: "text-slate-700",
            },
            {
              label: "Lunas 12 Bulan",
              value: totalLunas,
              color: "text-emerald-600",
            },
            {
              label: "Bayar Sebagian",
              value: data.filter((r) => r.paid.length > 0 && r.paid.length < 12)
                .length,
              color: "text-amber-600",
            },
            {
              label: "Belum Bayar",
              value: data.filter((r) => r.paid.length === 0).length,
              color: "text-red-500",
            },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-3">
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tahun — {tahun}</CardTitle>
          <div className="flex gap-2 flex-wrap items-center">
            <Input
              type="number"
              value={tahun}
              onChange={(e) => setTahun(parseInt(e.target.value) || nowYear)}
              className="w-28"
            />
            <Button size="sm" onClick={load} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Tampilkan
            </Button>
            <Input
              placeholder="Cari nama / sekolah..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-52"
            />
          </div>
        </CardHeader>
        <CardContent ref={printRef}>
          <div
            className="overflow-x-auto border rounded-lg max-h-[62vh]"
            style={{ border: "1px solid #e2e8f0" }}
          >
            <table
              className="w-full border-collapse text-sm"
              style={{ borderSpacing: 0 }}
            >
              <thead>
                <tr>
                  <th className="sticky top-0 left-0 z-20 bg-slate-100 border p-2 min-w-[36px]">
                    #
                  </th>
                  <th className="sticky top-0 left-[46px] z-20 bg-slate-100 border p-2 min-w-[165px] text-left">
                    Nama Anggota
                  </th>
                  {BULAN.map((m, i) => (
                    <th
                      key={m}
                      className="sticky top-0 z-10 bg-slate-100 border p-1.5 min-w-[42px]"
                    >
                      <div className="text-xs font-semibold">{m}</div>
                      <div
                        className="text-[9px] font-normal leading-tight"
                        style={{
                          color:
                            perBulan[i].sudah === perBulan[i].total &&
                            perBulan[i].total > 0
                              ? "#16a34a"
                              : "#94a3b8",
                        }}
                      >
                        {perBulan[i].sudah}/{perBulan[i].total}
                      </div>
                    </th>
                  ))}
                  <th className="sticky top-0 z-10 bg-slate-100 border p-2 min-w-[52px]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={15}
                      className="text-center p-8 text-muted-foreground"
                    >
                      <Loader2 className="h-5 w-5 animate-spin inline mr-2" />{" "}
                      Memuat...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={15}
                      className="text-center p-8 text-muted-foreground"
                    >
                      {search
                        ? "Tidak ada hasil pencarian."
                        : "Belum ada data anggota."}
                    </td>
                  </tr>
                ) : (
                  pagedFiltered.map((r, idx) => {
                    const n = r.paid.length;
                    const bg =
                      n === 12
                        ? "bg-emerald-50"
                        : n === 0
                          ? "bg-red-50/50"
                          : "";
                    return (
                      <tr
                        key={r.id}
                        className={`hover:bg-blue-50 transition-colors ${bg}`}
                      >
                        <td className="sticky left-0 bg-white border p-2 text-center text-xs text-muted-foreground">
                          {(page - 1) * pageSize + idx + 1}
                        </td>
                        <td
                          className="sticky left-[46px] bg-white border p-2 text-left"
                          style={{ borderRight: "2px solid #94a3b8" }}
                        >
                          <div className="font-medium text-sm leading-snug">
                            {r.nama}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {r.unit_kerja}
                          </div>
                        </td>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(
                          (m) => (
                            <td key={m} className="border p-1.5 text-center">
                              {r.paid.includes(m) ? (
                                <span className="text-emerald-600 font-bold text-base leading-none">
                                  ✓
                                </span>
                              ) : (
                                <span className="text-slate-300 text-sm">
                                  —
                                </span>
                              )}
                            </td>
                          ),
                        )}
                        <td className="border p-2 text-center">
                          <span
                            className={`text-xs font-bold ${
                              n === 12
                                ? "text-emerald-600"
                                : n === 0
                                  ? "text-red-500"
                                  : "text-amber-600"
                            }`}
                          >
                            {n}/12
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            ✓ hijau = sudah bayar &nbsp;|&nbsp; — = belum bayar &nbsp;|&nbsp;
            <span className="text-emerald-600 font-medium">Hijau muda</span> =
            lunas 12 bulan &nbsp;|&nbsp;
            <span className="text-red-500 font-medium">Merah muda</span> = belum
            bayar sama sekali
          </p>
          {filtered.length > 0 && <PaginationControls page={page} totalPages={totalPages} totalItems={filtered.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />}
          <p className="text-xs text-muted-foreground">Cetak/Excel tetap pakai semua {filtered.length} baris (tidak terpotong halaman).</p>
        </CardContent>
      </Card>
    </div>
  );
}
