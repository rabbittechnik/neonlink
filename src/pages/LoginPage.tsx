import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { LogIn, UserPlus, Zap, Lock, Mail, User, Sparkles, Smartphone, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/auth/AuthContext";

const errorMessage = (code: string) => {
  switch (code) {
    case "invalid_credentials":
      return "E-Mail oder Passwort ist falsch.";
    case "email_taken":
      return "Diese E-Mail ist bereits registriert.";
    case "password_min_length_6":
      return "Passwort mindestens 6 Zeichen.";
    case "displayName, email and password are required":
      return "Bitte alle Felder ausfüllen.";
    case "displayName, email, password and phone are required":
      return "Bitte alle Felder inklusive Handynummer ausfüllen.";
    case "phone_taken":
      return "Diese Handynummer ist bereits registriert.";
    case "phone_invalid":
      return "Ungültige Handynummer (mindestens ca. 8 Ziffern, z. B. 0171 … oder +49 …).";
    case "email and password are required":
      return "E-Mail und Passwort eingeben.";
    case "network_error":
    case "Failed to fetch":
      return "Server nicht erreichbar. Backend starten: Im Ordner „server“ den Befehl „npm run dev“ ausführen (Port 4000), danach Seite neu laden.";
    case "login_failed":
    case "register_failed":
      return "Anmeldung fehlgeschlagen. Backend prüfen (läuft es auf Port 4000?) und erneut versuchen.";
    case "invalid_response":
      return "Unerwartete Antwort vom Server. Backend-Version und Port prüfen.";
    default:
      return "Etwas ist schiefgelaufen. Bitte erneut versuchen.";
  }
};

export default function LoginPage() {
  const { user, ready, login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "register" && registerStep === 1) {
      if (!displayName.trim() || !email.trim() || !password) {
        setError(errorMessage("displayName, email and password are required"));
        return;
      }
      if (password.length < 6) {
        setError(errorMessage("password_min_length_6"));
        return;
      }
      setRegisterStep(2);
      return;
    }

    setBusy(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        if (!phone.trim()) {
          setError("Bitte Handynummer eingeben.");
          setBusy(false);
          return;
        }
        await register(displayName, email, password, phone);
      }
      navigate("/", { replace: true });
    } catch (err) {
      const code = err instanceof Error ? err.message : "unknown";
      setError(errorMessage(code));
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
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center font-black text-xl shadow-lg shadow-cyan-500/40 ring-2 ring-cyan-300/30">
              NL
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.35em] text-cyan-300/90 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> NeonLink
              </div>
              <h1 className="text-2xl font-semibold mt-1 bg-gradient-to-r from-cyan-200 to-violet-200 bg-clip-text text-transparent">
                Willkommen zurück
              </h1>
            </div>
          </div>

          <div className="rounded-[28px] border border-cyan-400/25 bg-white/[0.06] backdrop-blur-2xl shadow-2xl shadow-cyan-500/10 overflow-hidden">
            <div className="flex p-1.5 gap-1 m-3 rounded-2xl bg-black/30 border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                  setRegisterStep(1);
                  setPhone("");
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
                  mode === "login"
                    ? "bg-gradient-to-r from-cyan-500/30 to-blue-500/20 text-cyan-100 ring-1 ring-cyan-400/40"
                    : "text-white/90 hover:text-white font-semibold"
                }`}
              >
                <LogIn className="h-4 w-4" /> Einloggen
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError(null);
                  setRegisterStep(1);
                  setPhone("");
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
                  mode === "register"
                    ? "bg-gradient-to-r from-fuchsia-500/30 to-violet-500/20 text-fuchsia-100 ring-1 ring-fuchsia-400/40"
                    : "text-white/90 hover:text-white font-semibold"
                }`}
              >
                <UserPlus className="h-4 w-4" /> Registrieren
              </button>
            </div>

            <form onSubmit={onSubmit} className="px-6 pb-8 pt-2 space-y-4">
              {mode === "register" && registerStep === 2 ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterStep(1);
                      setError(null);
                    }}
                    className="text-xs text-violet-300 hover:text-violet-200 flex items-center gap-1"
                  >
                    <ArrowLeft className="h-3 w-3" /> Zurück zu Name &amp; Passwort
                  </button>
                  <p className="text-xs font-medium text-white/90">
                    Schritt 2 von 2: Handynummer ist Pflicht, damit dich Kontakte finden können.
                  </p>
                  <div className="space-y-1.5">
                    <label className="text-xs text-cyan-100 font-semibold uppercase tracking-wider flex items-center gap-2">
                      <Smartphone className="h-3 w-3" /> Handynummer
                    </label>
                    <Input
                      required
                      autoComplete="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="z. B. 0171 1234567 oder +49 …"
                      className="h-12 rounded-xl bg-white/5 border-cyan-400/20 text-white placeholder:text-white/50"
                    />
                  </div>
                </div>
              ) : null}

              {mode === "register" && registerStep === 1 ? (
                <div className="space-y-1.5">
                  <label className="text-xs text-cyan-100 font-semibold uppercase tracking-wider flex items-center gap-2">
                    <User className="h-3 w-3" /> Name
                  </label>
                  <Input
                    required
                    autoComplete="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Wie sollen wir dich nennen?"
                    className="h-12 rounded-xl bg-white/5 border-cyan-400/20 text-white placeholder:text-white/50"
                  />
                </div>
              ) : null}

              {mode === "login" || (mode === "register" && registerStep === 1) ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs text-cyan-100 font-semibold uppercase tracking-wider flex items-center gap-2">
                      <Mail className="h-3 w-3" /> E-Mail
                    </label>
                    <Input
                      required
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="du@beispiel.de"
                      className="h-12 rounded-xl bg-white/5 border-cyan-400/20 text-white placeholder:text-white/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-cyan-100 font-semibold uppercase tracking-wider flex items-center gap-2">
                      <Lock className="h-3 w-3" /> Passwort
                    </label>
                    <Input
                      required
                      type="password"
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={mode === "register" ? 6 : undefined}
                      className="h-12 rounded-xl bg-white/5 border-cyan-400/20 text-white placeholder:text-white/50"
                    />
                  </div>
                </>
              ) : null}

              {mode === "login" ? (
                <div className="text-right">
                  <Link
                    to="/forgot-password"
                    className="text-xs text-violet-300 hover:text-violet-200 transition-colors"
                  >
                    Passwort vergessen?
                  </Link>
                </div>
              ) : null}

              {error ? (
                <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <Button
                type="submit"
                disabled={busy || !ready}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500/80 to-violet-600/80 hover:from-cyan-400 hover:to-violet-500 text-white font-semibold border border-white/10 shadow-lg shadow-cyan-500/20"
              >
                {busy ? (
                  "Bitte warten…"
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2 inline" />
                    {mode === "login"
                      ? "Sicher einloggen"
                      : registerStep === 1
                        ? "Weiter zur Handynummer"
                        : "Konto erstellen"}
                  </>
                )}
              </Button>
            </form>
          </div>

          <p className="text-center text-xs font-medium text-white/85 mt-6">
            Demo: bianca@example.com / demo123 · registrierte Nummern z. B. enden auf …111111 (Bianca) und …222222
            (Matze)
          </p>
        </motion.div>
      </div>
    </div>
  );
}
