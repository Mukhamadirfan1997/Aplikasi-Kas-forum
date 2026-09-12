import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/lib/utils";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

type Stats = {
  saldo: number;
  total_masuk: number;
  total_keluar: number;
  masuk_bulan: number;
  keluar_bulan: number;
  anggota_aktif: number;
  belum_bayar: number;
  tren: { bulan: string; masuk: number; keluar: number; saldo: number }[];
};
type Tunggakan = { id: number; nama: string; unit_kerja: string };
type KasView = {
  id: number;
  tipe: string;
  kategori_nama: string | null;
  nominal: number;
  tanggal: string;
  keterangan: string;
  penanggung_jawab: string | null;
  bukti: string | null;
};

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [tunggakan, setTunggakan] = useState<Tunggakan[]>([]);
  const [riwayat, setRiwayat] = useState<KasView[]>([]);
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);
  void _error;
  const [tPage, setTPage] = useState(1);
  const [tPageSize, setTPageSize] = useState(10);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await invoke<Stats>("get_dashboard_stats");
      setStats(s);
      const t = await invoke<Tunggakan[]>("get_tunggakan_list");
      setTunggakan(t);
      // riwayat terbaru bulan ini
      const today = new Date();
      const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
      const first = `${ym}-01`;
      const last = `${ym}-${new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate().toString().padStart(2, "0")}`;
      try {
        const r = await invoke<KasView[]>("get_kas_transaksi", {
          tipe: null,
          kategoriId: null,
          dari: first,
          sampai: last,
          limit: 5,
        } as any);
        setRiwayat(r);
      } catch {
        setRiwayat([]);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("invoke")) {
        // mock untuk vite dev
        const mock: Stats = {
          saldo: 1250000,
          total_masuk: 2000000,
          total_keluar: 750000,
          masuk_bulan: 300000,
          keluar_bulan: 120000,
          anggota_aktif: 42,
          belum_bayar: 8,
          tren: [
            { bulan: "2025-10", masuk: 200000, keluar: 50000, saldo: 150000 },
            { bulan: "2025-11", masuk: 250000, keluar: 80000, saldo: 170000 },
            { bulan: "2025-12", masuk: 300000, keluar: 100000, saldo: 200000 },
            { bulan: "2026-01", masuk: 280000, keluar: 90000, saldo: 190000 },
            { bulan: "2026-02", masuk: 300000, keluar: 70000, saldo: 230000 },
            { bulan: "2026-03", masuk: 320000, keluar: 110000, saldo: 210000 },
            { bulan: "2026-04", masuk: 300000, keluar: 95000, saldo: 205000 },
            { bulan: "2026-05", masuk: 310000, keluar: 85000, saldo: 225000 },
            { bulan: "2026-06", masuk: 300000, keluar: 120000, saldo: 180000 },
            { bulan: "2026-07", masuk: 330000, keluar: 100000, saldo: 230000 },
            { bulan: "2026-08", masuk: 320000, keluar: 90000, saldo: 230000 },
            { bulan: "2026-09", masuk: 300000, keluar: 120000, saldo: 180000 },
          ],
        };
        setStats(mock);
        setTunggakan([
          { id: 1, nama: "Budi Santoso", unit_kerja: "SDN 1" },
          { id: 2, nama: "Siti Aminah", unit_kerja: "SDN 2" },
          { id: 3, nama: "Ahmad Fauzi", unit_kerja: "SDN 3" },
        ]);
        setRiwayat([
          {
            id: 101,
            tipe: "masuk",
            kategori_nama: "Iuran",
            nominal: 30000,
            tanggal: "2026-09-05",
            keterangan: "Iuran Budi Sep",
            penanggung_jawab: null,
            bukti: null,
          },
          {
            id: 102,
            tipe: "keluar",
            kategori_nama: "Konsumsi",
            nominal: 50000,
            tanggal: "2026-09-06",
            keterangan: "Konsumsi rapat",
            penanggung_jawab: "Budi Santoso",
            bukti: null,
          },
        ]);
        setError(null);
      } else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, []);
  useEffect(() => { setTPage(1); }, [tunggakan.length, tPageSize]);
  const tTotalPages = Math.max(1, Math.ceil(tunggakan.length / tPageSize));
  const tPaged = tunggakan.slice((tPage - 1) * tPageSize, tPage * tPageSize);

  if (loading)
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat dashboard...
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Beranda</h2>
          <p className="text-sm text-white/80">
            Ringkasan keuangan kas dan status iuran terkini
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={fetch}
          disabled={loading}
          className="bg-white text-[#667eea] hover:bg-white/90 shadow self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />{" "}
          Muat Ulang
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Sisa Uang Kas</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatRupiah(stats?.saldo ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Uang yang ada sekarang
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Uang Masuk Bulan Ini
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatRupiah(stats?.masuk_bulan ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total semua pemasukan: {formatRupiah(stats?.total_masuk ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Uang Keluar Bulan Ini
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatRupiah(stats?.keluar_bulan ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total semua pengeluaran: {formatRupiah(stats?.total_keluar ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Belum Bayar Bulan Ini
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.belum_bayar ?? 0} orang
            </div>
            <p className="text-xs text-muted-foreground">
              Dari {stats?.anggota_aktif ?? 0} anggota aktif
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Grafik Uang Masuk & Keluar (12 Bulan)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {stats?.tren && stats.tren.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.tren}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bulan" tick={{ fontSize: 10 }} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v: any) => `${Number(v) / 1000}k`}
                  />
                  <Tooltip formatter={(v: any) => formatRupiah(Number(v))} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="masuk"
                    stroke="#16a34a"
                    name="Masuk"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="keluar"
                    stroke="#dc2626"
                    name="Keluar"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">
                Belum ada data tren.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Sisa Kas per Bulan (6 Bulan Terakhir)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {stats?.tren ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.tren.slice(-6)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bulan" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: any) => formatRupiah(Number(v))} />
                  <Bar
                    dataKey="saldo"
                    fill="hsl(var(--primary))"
                    name="Net"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Belum Bayar Bulan Ini (
            {tunggakan.length})
          </CardTitle>
          <Badge variant={tunggakan.length > 0 ? "destructive" : "secondary"}>
            {tunggakan.length} orang
          </Badge>
        </CardHeader>
        <CardContent>
          {tunggakan.length === 0 ? (
            <p className="text-sm text-emerald-600">
              ✓ Semua anggota sudah lunas bulan ini.
            </p>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tPaged.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.nama}</TableCell>
                      <TableCell>{t.unit_kerja}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {tunggakan.length > tPageSize && (
                <div className="mt-2">
                  <PaginationControls page={tPage} totalPages={tTotalPages} totalItems={tunggakan.length} pageSize={tPageSize} onPageChange={setTPage} onPageSizeChange={(s) => { setTPageSize(s); setTPage(1); }} />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            🕘 5 Transaksi Terakhir Bulan Ini
          </CardTitle>
        </CardHeader>
        <CardContent>
          {riwayat.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Belum ada transaksi bulan ini
            </p>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead>Petugas</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {riwayat.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{r.tanggal}</TableCell>
                      <TableCell
                        className="text-sm max-w-[260px] truncate"
                        title={r.keterangan}
                      >
                        {r.keterangan}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.penanggung_jawab ? (
                          <span className="bg-blue-50 border px-1.5 py-0.5 rounded-full">
                            {r.penanggung_jawab}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${r.tipe === "masuk" ? "text-emerald-600" : "text-destructive"}`}
                      >
                        {r.tipe === "masuk" ? "+" : "-"}{" "}
                        {formatRupiah(r.nominal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
