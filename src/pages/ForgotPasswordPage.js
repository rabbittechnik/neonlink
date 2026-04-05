import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_BASE_URL } from "@/config";
export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [done, setDone] = useState(false);
    const [devLink, setDevLink] = useState(null);
    const onSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setBusy(true);
        setDevLink(null);
        try {
            const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim() }),
            });
            const data = (await res.json());
            if (!res.ok) {
                if (data.error === "email is required") {
                    setError("Bitte E-Mail eingeben.");
                }
                else if (data.error === "email_delivery_failed") {
                    setError("Die E-Mail konnte gerade nicht versendet werden. Bitte später erneut versuchen oder den Support informieren.");
                }
                else {
                    setError("Anfrage fehlgeschlagen.");
                }
                return;
            }
            setDone(true);
            if (typeof data.devResetLink === "string") {
                setDevLink(data.devResetLink);
            }
        }
        catch {
            setError("Netzwerkfehler. Ist der Server gestartet?");
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsxs("div", { className: "min-h-screen w-full bg-[#050816] text-white overflow-hidden relative", children: [_jsx("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.22),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(168,85,247,0.2),transparent_28%),radial-gradient(circle_at_50%_90%,rgba(59,130,246,0.12),transparent_40%)]" }), _jsx("div", { className: "absolute inset-0 opacity-[0.15] [background-image:linear-gradient(rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.06)_1px,transparent_1px)] [background-size:48px_48px]" }), _jsx(motion.div, { className: "absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-400 via-violet-500 to-cyan-400", animate: { opacity: [0.6, 1, 0.6] }, transition: { duration: 3, repeat: Infinity } }), _jsx("div", { className: "relative z-10 min-h-screen flex items-center justify-center p-6", children: _jsxs(motion.div, { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 }, className: "w-full max-w-md", children: [_jsxs("div", { className: "flex items-center justify-center gap-3 mb-8", children: [_jsx("div", { className: "h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center font-black text-lg shadow-lg shadow-cyan-500/40 ring-2 ring-cyan-300/30", children: "NL" }), _jsxs("div", { children: [_jsxs("div", { className: "text-xs uppercase tracking-[0.35em] text-cyan-300/90 flex items-center gap-1", children: [_jsx(Sparkles, { className: "h-3 w-3" }), " Passwort"] }), _jsx("div", { className: "text-lg font-semibold text-white/95", children: "Zur\u00FCcksetzen" })] })] }), !done ? (_jsxs("form", { onSubmit: onSubmit, className: "rounded-3xl border border-cyan-400/20 bg-white/[0.06] backdrop-blur-xl p-8 shadow-xl shadow-violet-900/20 ring-1 ring-white/10", children: [_jsx("p", { className: "text-sm text-white/65 leading-relaxed mb-6", children: "Wir senden dir einen Link zum Neusetzen des Passworts. In der Entwicklungsumgebung erscheint der Link direkt hier; sp\u00E4ter erfolgt das per E-Mail." }), _jsx("label", { className: "block text-xs font-medium text-cyan-200/90 uppercase tracking-wider mb-2", children: "E-Mail" }), _jsxs("div", { className: "relative mb-6", children: [_jsx(Mail, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-400/70" }), _jsx(Input, { type: "email", autoComplete: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "du@beispiel.de", className: "pl-10 h-12 bg-black/30 border-cyan-500/25 text-white placeholder:text-white/35 focus-visible:ring-cyan-400/50" })] }), error ? (_jsx("p", { className: "text-sm text-red-300/95 mb-4", role: "alert", children: error })) : null, _jsx(Button, { type: "submit", disabled: busy, className: "w-full h-12 bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-semibold shadow-lg shadow-cyan-500/25 border-0", children: busy ? "Senden…" : "Link anfordern" })] })) : (_jsxs("div", { className: "rounded-3xl border border-emerald-400/25 bg-white/[0.06] backdrop-blur-xl p-8 shadow-xl ring-1 ring-white/10", children: [_jsx("h1", { className: "text-lg font-semibold text-emerald-200/95", children: "Anfrage erhalten" }), _jsx("p", { className: "text-sm text-white/65 mt-3 leading-relaxed", children: "Wenn diese E-Mail bei uns registriert ist, kannst du das Passwort jetzt zur\u00FCcksetzen. Pr\u00FCfe dein Postfach \u2013 oder unten den Entwicklungs-Link, falls dein Server im Modus \u201Edevelopment\u201C l\u00E4uft." }), devLink ? (_jsxs("div", { className: "mt-6 p-4 rounded-xl bg-black/40 border border-cyan-500/20", children: [_jsx("p", { className: "text-xs text-cyan-200/80 uppercase tracking-wide mb-2", children: "Nur Entwicklung" }), _jsx("a", { href: devLink, className: "text-sm text-cyan-300 break-all underline-offset-2 hover:text-cyan-200 hover:underline", children: "Passwort jetzt neu setzen" })] })) : null, _jsxs(Link, { to: "/login", className: "inline-flex z-10 items-center gap-2 mt-8 text-sm text-cyan-300 hover:text-cyan-200 relative", children: [_jsx(ArrowLeft, { className: "h-4 w-4" }), "Zum Login"] })] })), !done ? (_jsxs(Link, { to: "/login", className: "inline-flex items-center gap-2 mt-8 text-sm text-cyan-300 hover:text-cyan-200", children: [_jsx(ArrowLeft, { className: "h-4 w-4" }), "Zur\u00FCck zum Login"] })) : null] }) })] }));
}
