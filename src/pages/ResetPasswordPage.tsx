import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, KeyRound, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_BASE_URL } from "@/config";

const errMsg = (code: string) => {
  switch (code) {
    case "password_min_length_6":
      return "Passwort mindestens 6 Zeichen.";
    case "invalid_or_expired_token":
      return "Link ungültig oder abgelaufen. Bitte erneut „Passwort vergessen“ anfordern.";
    case "token and newPassword are required":
      return "Bitte neues Passwort eingeben.";
    default:
      return "Zurücksetzen fehlgeschlagen. Bitte erneut versuchen.";
  }
};

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = useMemo(() => (params.get("token") ?? "").trim(), [params]);
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwörter stimmen nicht überein.");
      return;
    }
    if (password.length < 6) {
      setError("Passwort mindestens 6 Zeichen.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(errMsg(data.error ?? "unknown"));
        return;
      }
      setDone(true);
      setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch {
      setError("Netzwerkfehler. Ist der Server gestartet?");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050816] text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.22),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(168,85,247,0.2),transparent_28%),radial-gradient(circle_at_50%_90%,rgba(59,130,246,0.12),transparent_40%)]" />
      <div className="absolute inset-0 opacity-[0.15] [background-image:linear-gradient(rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.06)_1px,transparent_1px)] [background-size:48px_48px]" />
      <motion.div
        className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-400 via-violet-500 to-cyan-400"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center font-black text-lg shadow-lg shadow-cyan-500/40 ring-2 ring-cyan-300/30">
              NL
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.35em] text-cyan-300/90 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Neues Kennwort
              </div>
              <div className="text-lg font-semibold text-white/95">Passwort setzen</div>
            </div>
          </div>

          {!token ? (
            <div className="rounded-3xl border border-red-400/25 bg-white/[0.06] backdrop-blur-xl p-8 ring-1 ring-white/10">
              <p className="text-sm text-red-200/90">
                Es fehlt ein gültiger Link. Bitte nutze den Link aus der E-Mail oder aus der Passwort-vergessen
                Seite.
              </p>
              <Link
                to="/forgot-password"
                className="inline-flex items-center gap-2 mt-6 text-sm text-cyan-300 hover:text-cyan-200"
              >
                <ArrowLeft className="h-4 w-4" /> Erneut anfordern
              </Link>
            </div>
          ) : done ? (
            <div className="rounded-3xl border border-emerald-400/30 bg-white/[0.06] backdrop-blur-xl p-8 text-center ring-1 ring-white/10">
              <p className="text-emerald-200 font-medium">Passwort gespeichert.</p>
              <p className="text-sm text-white/60 mt-2">Weiterleitung zum Login…</p>
            </div>
          ) : (
            <form
              onSubmit={onSubmit}
              className="rounded-3xl border border-violet-400/20 bg-white/[0.06] backdrop-blur-xl p-8 shadow-xl shadow-violet-900/20 ring-1 ring-white/10"
            >
              <label className="block text-xs font-medium text-cyan-200/90 uppercase tracking-wider mb-2">
                Neues Passwort
              </label>
              <div className="relative mb-4">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-400/70" />
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 h-12 bg-black/30 border-violet-500/25 text-white placeholder:text-white/35 focus-visible:ring-violet-400/50"
                />
              </div>
              <label className="block text-xs font-medium text-cyan-200/90 uppercase tracking-wider mb-2">
                Wiederholen
              </label>
              <div className="relative mb-6">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-400/70" />
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 h-12 bg-black/30 border-violet-500/25 text-white placeholder:text-white/35 focus-visible:ring-violet-400/50"
                />
              </div>
              {error ? (
                <p className="text-sm text-red-300/95 mb-4" role="alert">
                  {error}
                </p>
              ) : null}
              <Button
                type="submit"
                disabled={busy}
                className="w-full h-12 bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-semibold shadow-lg shadow-cyan-500/25 border-0"
              >
                {busy ? "Speichern…" : "Passwort speichern"}
              </Button>
            </form>
          )}

          <Link
            to="/login"
            className="inline-flex items-center gap-2 mt-8 text-sm text-cyan-300 hover:text-cyan-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Zum Login
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
