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
};

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "kas_forum_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try { setUser(JSON.parse(raw)); setLoading(false); return; } catch {}
      }
      // Fallback Tauri: coba baca session dari file (persist meski WebView2 clear)
      try {
        if ("__TAURI__" in window || "__TAURI_INTERNALS__" in window || "__TAURI_IPC__" in window) {
          const { readTextFile } = await import("@tauri-apps/plugin-fs");
          const { appDataDir, join } = await import("@tauri-apps/api/path");
          const dir = await appDataDir();
          const p = await join(dir, "session.json");
          const txt = await readTextFile(p);
          const u = JSON.parse(txt);
          if (u?.username) {
            setUser(u);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
          }
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const persist = async (u: UserPublic) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    try {
      if ("__TAURI__" in window || "__TAURI_INTERNALS__" in window || "__TAURI_IPC__" in window) {
        const { writeTextFile, create } = await import("@tauri-apps/plugin-fs");
        const { appDataDir, join } = await import("@tauri-apps/api/path");
        const dir = await appDataDir();
        try { await create(dir).catch(()=>{}); } catch {}
        const p = await join(dir, "session.json");
        await writeTextFile(p, JSON.stringify(u));
      }
    } catch {}
  };
  const clearPersist = async () => {
    localStorage.removeItem(STORAGE_KEY);
    try {
      if ("__TAURI__" in window || "__TAURI_INTERNALS__" in window || "__TAURI_IPC__" in window) {
        const { remove } = await import("@tauri-apps/plugin-fs");
        const { appDataDir, join } = await import("@tauri-apps/api/path");
        const p = await join(await appDataDir(), "session.json");
        await remove(p).catch(()=>{});
      }
    } catch {}
  };
  const login = async (username: string, password: string) => {
    // coba invoke dulu
    try {
      const u = await invoke<UserPublic>("login", { username, password });
      setUser(u);
      await persist(u);
      return;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : typeof e === "string" ? e : JSON.stringify(e);
      // fallback mock untuk vite dev tanpa tauri: izinkan admin/admin123
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
          await persist(mock);
          return;
        }
      }
      throw new Error(msg);
    }
  };

  const logout = () => {
    setUser(null);
    clearPersist();
  };

  return <AuthContext.Provider value={{ user, login, logout, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus di dalam AuthProvider");
  return ctx;
}
