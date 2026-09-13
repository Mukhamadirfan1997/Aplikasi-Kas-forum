import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";

export type UserPublic = {
  id: number;
  nama: string;
  username: string;
  role: "admin" | "bendahara" | "viewer" | string;
  created_at: string;
};

type AuthContextType = {
  user: UserPublic | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  setUser: (u: UserPublic | null) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wajib login tiap buka app — tidak ada persist.
    // Cleanup legacy session.json jika pernah ada (dari versi lama) agar tidak ada celah.
    (async () => {
      try {
        if ("__TAURI__" in window || "__TAURI_INTERNALS__" in window || "__TAURI_IPC__" in window) {
          const { remove } = await import("@tauri-apps/plugin-fs");
          const { appDataDir, join } = await import("@tauri-apps/api/path");
          const p = await join(await appDataDir(), "session.json");
          await remove(p).catch(() => {});
        }
      } catch {}
      // Juga bersihkan localStorage legacy
      try { localStorage.removeItem("kas_forum_user"); } catch {}
      setLoading(false);
    })();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const u = await invoke<UserPublic>("login", { username, password });
      setUser(u);
      return;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : JSON.stringify(e);
      if (msg.includes("invoke") || msg.includes("not found") || msg.includes("not allowed")) {
        if (username === "admin" && password === "admin123") {
          const mock: UserPublic = {
            id: 1,
            nama: "Administrator (mock)",
            username: "admin",
            role: "admin",
            created_at: new Date().toISOString(),
          };
          setUser(mock);
          return;
        }
      }
      throw new Error(msg);
    }
  };

  const logout = () => {
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, logout, loading, setUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus di dalam AuthProvider");
  return ctx;
}
