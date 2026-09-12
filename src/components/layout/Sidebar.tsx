import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  LayoutDashboard,
  Users,
  Wallet,
  CheckSquare,
  BarChart2,
  History,
  Settings,
  BookOpen,
} from "lucide-react";

export type NavItem = {
  label: string;
  key: string;
  icon: React.ReactNode;
};

const NAV: NavItem[] = [
  {
    label: "Beranda",
    key: "dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  { label: "Anggota", key: "anggota", icon: <Users className="h-4 w-4" /> },
  { label: "Kas", key: "kas", icon: <Wallet className="h-4 w-4" /> },
  {
    label: "Daftar Lunas",
    key: "checklist",
    icon: <CheckSquare className="h-4 w-4" />,
  },
  { label: "Laporan", key: "laporan", icon: <BarChart2 className="h-4 w-4" /> },
  { label: "Riwayat", key: "riwayat", icon: <History className="h-4 w-4" /> },
  {
    label: "Petunjuk",
    key: "petunjuk",
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    label: "Pengaturan",
    key: "pengaturan",
    icon: <Settings className="h-4 w-4" />,
  },
];

export function Sidebar({
  active,
  onChange,
}: {
  active: string;
  onChange: (k: string) => void;
}) {
  const { user, logout } = useAuth();
  const [namaForum, setNamaForum] = useState("Forum PPPK");
  useEffect(() => {
    invoke<any>("get_profil")
      .then((p) => {
        if (p?.nama_forum) setNamaForum(p.nama_forum);
      })
      .catch(() => {});
  }, []);
  return (
    <aside
      className="w-56 h-full flex flex-col flex-shrink-0 backdrop-blur-md"
      style={{
        background: "rgba(255,255,255,0.12)",
        borderRight: "1px solid rgba(255,255,255,0.2)",
      }}
    >
      {/* Header */}
      <div
        className="p-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.2)" }}
      >
        <div className="flex items-center gap-2.5">
          <img
            src="/app-logo.png"
            alt="Logo"
            className="h-10 w-10 rounded-xl object-cover shadow-sm border border-white/25 flex-shrink-0"
          />
          <div className="overflow-hidden min-w-0">
            <h1 className="font-bold text-sm text-white leading-tight truncate">
              {namaForum}
            </h1>
            <p className="text-[11px] text-white/70 mt-0.5">Aplikasi Kas</p>
          </div>
        </div>
        {user && (
          <div
            className="mt-3 text-xs rounded-lg px-2.5 py-2"
            style={{ background: "rgba(255,255,255,0.18)" }}
          >
            <div className="font-semibold truncate text-white">{user.nama}</div>
            <div className="text-white/70 truncate">
              @{user.username} &bull; {user.role}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
        {NAV.map((n) => (
          <button
            key={n.key}
            onClick={() => onChange(n.key)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center gap-2.5",
              active === n.key
                ? "bg-white/25 text-white font-semibold shadow-sm"
                : "text-white/80 hover:bg-white/15 hover:text-white",
            )}
          >
            <span className="opacity-90 flex-shrink-0">{n.icon}</span>
            <span>{n.label}</span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div
        className="p-2.5 space-y-1.5"
        style={{ borderTop: "1px solid rgba(255,255,255,0.2)" }}
      >
        <Button
          variant="secondary"
          size="sm"
          className="w-full justify-start bg-white/15 hover:bg-white/25 text-white border-0 gap-2"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" /> Keluar
        </Button>
        <div className="text-[10px] text-white/60 text-center px-1">
          v0.1.0 &bull;{" "}
          <span className="text-white/80 font-medium">IrfanDev97</span>
        </div>
      </div>
    </aside>
  );
}
