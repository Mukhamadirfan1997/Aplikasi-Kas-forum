import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Shield } from "lucide-react";

export function Login() {
  const { login } = useAuth();
  const [namaForum, setNamaForum] = useState("Forum PPPK");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    invoke<any>("get_profil")
      .then((p) => {
        if (p?.nama_forum) setNamaForum(p.nama_forum);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password.trim()) {
      setError("Username dan password wajib diisi");
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : JSON.stringify(err);
      // bersihkan prefix Rust error yang panjang
      setError(msg.replace(/^.*?:\s*/, "").slice(0, 200));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      <Card className="w-full max-w-md shadow-2xl border border-white/30 bg-white/95 backdrop-blur-md rounded-2xl overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#667eea] to-[#764ba2]" />
        <CardHeader className="text-center space-y-2 pt-6 pb-4">
          <div className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/30 overflow-hidden border-2 border-white/60">
            <img
              src="/app-logo.png"
              alt="Logo Forum PPPK"
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-800">
              {namaForum}
            </CardTitle>
            <CardDescription className="text-sm text-slate-500 mt-1">
              Aplikasi Kas Forum &bull; Silakan Masuk
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="username"
                className="text-sm font-medium text-slate-700"
              >
                Nama Pengguna
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ketik nama pengguna"
                autoFocus
                autoComplete="username"
                className="h-10 rounded-lg border-slate-200 focus-visible:ring-[#667eea]"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-slate-700"
              >
                Kata Sandi
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ketik kata sandi"
                autoComplete="current-password"
                className="h-10 rounded-lg border-slate-200 focus-visible:ring-[#667eea]"
              />
            </div>
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full h-10 rounded-lg font-medium text-white shadow-md shadow-indigo-500/25 bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:opacity-95 transition-all"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Masuk ke Aplikasi
            </Button>
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-1">
              <Shield className="h-3 w-3 text-slate-400" /> Default:{" "}
              <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono text-[11px]">
                admin / admin123
              </code>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Developer Credit Footer */}
      <div className="mt-6 text-center text-xs text-white/70 space-y-1">
        <div>{namaForum} &bull; v0.1.0</div>
        <div className="text-white/90 font-medium">
          Dikembangkan oleh{" "}
          <span className="underline decoration-white/40 underline-offset-2">
            IrfanDev97
          </span>
        </div>
      </div>
    </div>
  );
}
