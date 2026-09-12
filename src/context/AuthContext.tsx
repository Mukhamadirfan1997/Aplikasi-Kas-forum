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
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {}
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    // coba invoke dulu
    try {
      const u = await invoke<UserPublic>("login", { username, password });
      setUser(u);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
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
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mock));
          return;
        }
      }
      throw new Error(msg);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return <AuthContext.Provider value={{ user, login, logout, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus di dalam AuthProvider");
  return ctx;
}
