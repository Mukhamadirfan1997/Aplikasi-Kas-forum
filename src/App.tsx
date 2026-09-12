import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Dashboard } from "@/pages/Dashboard";
import { Anggota } from "@/pages/Anggota";
import { Placeholder } from "@/pages/Placeholder";
import { Login } from "@/pages/Login";
import { Pengaturan } from "@/pages/Pengaturan";
import { Kas } from "@/pages/Kas";
import { Checklist } from "@/pages/Checklist";
import { Laporan } from "@/pages/Laporan";
import { Riwayat } from "@/pages/Riwayat";
import { Petunjuk } from "@/pages/Petunjuk";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  dashboard: "Beranda",
  anggota: "Daftar Anggota",
  kas: "Kas Masuk & Pengeluaran",
  checklist: "Daftar Lunas Tahunan",
  laporan: "Laporan Keuangan",
  riwayat: "Riwayat Kegiatan",
  petunjuk: "Petunjuk Penggunaan",
  pengaturan: "Pengaturan Sistem",
};

function App() {
  const { user, loading, logout } = useAuth();
  const [active, setActive] = useState("dashboard");

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Memuat...
      </div>
    );
  if (!user) return <Login />;

  // viewer tidak boleh kelola pengaturan user
  const isViewer = user.role === "viewer";

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar active={active} onChange={setActive} />
      <div className="flex-1 h-full flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header
          className="h-13 px-6 flex items-center justify-between flex-shrink-0 backdrop-blur-md"
          style={{
            background: "rgba(255,255,255,0.12)",
            borderBottom: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <div className="flex items-center gap-2 text-white">
            <span className="text-sm font-semibold tracking-wide">
              {PAGE_TITLES[active] || "Aplikasi Kas"}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <div
              className="hidden sm:flex items-center gap-2 text-xs px-3 py-1 rounded-full text-white"
              style={{ background: "rgba(255,255,255,0.18)" }}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-medium">{user.nama}</span>
              <span className="text-white/70">
                (@{user.username} &bull; {user.role})
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={logout}
              className="bg-white/20 hover:bg-red-500/80 hover:text-white text-white border-0 transition-all text-xs h-8 px-3 gap-1.5 shadow-sm"
              title="Keluar dari akun"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Keluar</span>
            </Button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="w-full">
            {active === "dashboard" && <Dashboard />}
            {active === "anggota" && <Anggota />}
            {active === "kas" && <Kas />}
            {active === "checklist" && <Checklist />}
            {active === "laporan" && <Laporan />}
            {active === "riwayat" && <Riwayat />}
            {active === "petunjuk" && <Petunjuk />}
            {active === "pengaturan" &&
              (isViewer ? (
                <Placeholder title="Akses Ditolak — Viewer tidak bisa membuka Pengaturan" />
              ) : (
                <Pengaturan />
              ))}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
