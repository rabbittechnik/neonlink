import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Check, Mail, Phone, Shield, User, X, XCircle, Loader2, Globe, Lock, Users, } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/auth/AuthContext";
import { fileToAvatarDataUrl } from "@/utils/fileToAvatarDataUrl";
import { maskPhoneDigits } from "@/utils/maskPhone";
const STATUS_OPTIONS = [
    { value: "online", label: "Online" },
    { value: "away", label: "Abwesend" },
    { value: "busy", label: "Beschäftigt" },
    { value: "offline", label: "Offline" },
    { value: "on_call", label: "Im Einsatz" },
];
const VIS_OPTIONS = [
    { value: "private", label: "Nur ich", icon: _jsx(Lock, { className: "h-3.5 w-3.5" }) },
    { value: "workspace", label: "Workspace-Mitglieder", icon: _jsx(Users, { className: "h-3.5 w-3.5" }) },
    { value: "public", label: "Öffentlich", icon: _jsx(Globe, { className: "h-3.5 w-3.5" }) },
];
export function ProfileModal({ open, onClose, activeSectionId, activeSectionLabel }) {
    const { user, setAvatar, updateProfile, startEmailVerification, confirmEmailVerification, startPhoneVerification, confirmPhoneVerification, } = useAuth();
    const [displayName, setDisplayName] = useState("");
    const [bio, setBio] = useState("");
    const [statusMessage, setStatusMessage] = useState("");
    const [globalStatus, setGlobalStatus] = useState("online");
    const [sectionStatus, setSectionStatus] = useState("online");
    const [contactEmail, setContactEmail] = useState("");
    const [emailVis, setEmailVis] = useState("workspace");
    const [phoneVis, setPhoneVis] = useState("workspace");
    const [phoneInput, setPhoneInput] = useState("");
    const [busy, setBusy] = useState(false);
    const [hint, setHint] = useState(null);
    const [error, setError] = useState(null);
    const [avatarBusy, setAvatarBusy] = useState(false);
    const [emailCodeOpen, setEmailCodeOpen] = useState(false);
    const [phoneCodeOpen, setPhoneCodeOpen] = useState(false);
    const [emailCode, setEmailCode] = useState("");
    const [phoneCode, setPhoneCode] = useState("");
    const fileRef = useRef(null);
    useEffect(() => {
        if (!open || !user)
            return;
        setDisplayName(user.displayName);
        setBio(user.bio);
        setStatusMessage(user.statusMessage);
        setGlobalStatus(user.status);
        setSectionStatus(user.statusBySection[activeSectionId] ?? user.status);
        setContactEmail(user.contactEmail);
        setEmailVis(user.emailVisibility);
        setPhoneVis(user.phoneVisibility);
        setPhoneInput(user.phoneDigits ?? "");
        setHint(null);
        setError(null);
        setEmailCodeOpen(false);
        setPhoneCodeOpen(false);
        setEmailCode("");
        setPhoneCode("");
    }, [open, user, activeSectionId]);
    if (!user)
        return null;
    const onSave = async () => {
        setBusy(true);
        setError(null);
        setHint(null);
        try {
            const nextSectionMap = { ...user.statusBySection, [activeSectionId]: sectionStatus };
            await updateProfile({
                displayName: displayName.trim(),
                bio: bio.trim(),
                statusMessage: statusMessage.trim(),
                status: globalStatus,
                statusBySection: nextSectionMap,
                contactEmail: contactEmail.trim(),
                emailVisibility: emailVis,
                phoneVisibility: phoneVis,
                ...(phoneInput.trim() ? { phone: phoneInput.trim() } : {}),
            });
            onClose();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
        }
        finally {
            setBusy(false);
        }
    };
    const onAvatarPick = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file)
            return;
        if (!file.type.startsWith("image/")) {
            setError("Bitte ein Bild wählen.");
            return;
        }
        setAvatarBusy(true);
        setError(null);
        try {
            const dataUrl = await fileToAvatarDataUrl(file, 320, 0.85);
            await setAvatar(dataUrl);
            setHint("Profilbild aktualisiert.");
        }
        catch (err) {
            const code = err instanceof Error ? err.message : "";
            setError(code === "avatar_too_large"
                ? "Bild zu groß."
                : code === "invalid_avatar_format"
                    ? "Format nicht unterstützt."
                    : "Upload fehlgeschlagen.");
        }
        finally {
            setAvatarBusy(false);
        }
    };
    const VerifiedIcon = ({ ok }) => ok ? (_jsx(Check, { className: "h-4 w-4 text-emerald-400", "aria-label": "Verifiziert" })) : (_jsx(XCircle, { className: "h-4 w-4 text-amber-400/90", "aria-label": "Nicht verifiziert" }));
    return (_jsx(AnimatePresence, { children: open ? (_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md", role: "dialog", "aria-modal": "true", "aria-labelledby": "profile-modal-title", children: _jsxs(motion.div, { initial: { scale: 0.96, y: 12 }, animate: { scale: 1, y: 0 }, exit: { scale: 0.96, y: 12 }, className: "w-full max-w-lg max-h-[min(92vh,720px)] overflow-hidden rounded-3xl border border-white/12 bg-[#070d1c] shadow-2xl shadow-cyan-500/10 flex flex-col", children: [_jsxs("div", { className: "flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10 shrink-0", children: [_jsxs("h2", { id: "profile-modal-title", className: "text-lg font-semibold text-white flex items-center gap-2", children: [_jsx(User, { className: "h-5 w-5 text-cyan-300" }), "Mein Profil"] }), _jsx("button", { type: "button", onClick: onClose, disabled: busy, className: "p-2 rounded-xl text-white/55 hover:text-white hover:bg-white/10", "aria-label": "Schlie\u00DFen", children: _jsx(X, { className: "h-5 w-5" }) })] }), _jsxs("div", { className: "overflow-y-auto flex-1 px-5 py-4 space-y-5", children: [_jsxs("div", { className: "rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.06] to-white/[0.03] p-3", role: "status", "aria-label": "Verifizierungsstatus Kontaktdaten", children: [_jsx("div", { className: "text-[10px] uppercase tracking-wider text-white/40 mb-2", children: "Verifizierungsstatus" }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-2", children: [_jsxs("div", { className: `flex flex-1 items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${user.emailVerified
                                                    ? "border-emerald-400/35 bg-emerald-500/10"
                                                    : "border-amber-400/40 bg-amber-500/10"}`, children: [_jsxs("span", { className: "text-xs text-white/75 flex items-center gap-2 min-w-0", children: [_jsx(Mail, { className: "h-3.5 w-3.5 text-cyan-300/90 shrink-0" }), _jsx("span", { className: "truncate", children: "E-Mail (Profil)" })] }), _jsxs("span", { className: `text-xs font-semibold shrink-0 flex items-center gap-1.5 ${user.emailVerified ? "text-emerald-200" : "text-amber-100"}`, children: [_jsx(VerifiedIcon, { ok: user.emailVerified }), user.emailVerified ? "Verifiziert" : "Noch offen"] })] }), _jsxs("div", { className: `flex flex-1 items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${user.phoneVerified
                                                    ? "border-emerald-400/35 bg-emerald-500/10"
                                                    : "border-fuchsia-400/35 bg-fuchsia-950/20"}`, children: [_jsxs("span", { className: "text-xs text-white/75 flex items-center gap-2 min-w-0", children: [_jsx(Phone, { className: "h-3.5 w-3.5 text-fuchsia-300/90 shrink-0" }), _jsx("span", { className: "truncate", children: "Telefonnummer" })] }), _jsxs("span", { className: `text-xs font-semibold shrink-0 flex items-center gap-1.5 ${user.phoneVerified ? "text-emerald-200" : "text-fuchsia-100"}`, children: [_jsx(VerifiedIcon, { ok: user.phoneVerified }), user.phoneVerified ? "Verifiziert" : "Noch offen"] })] })] })] }), error ? (_jsx("div", { className: "rounded-2xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200", children: error })) : null, hint ? (_jsx("div", { className: "rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100", children: hint })) : null, _jsxs("div", { className: "flex flex-col items-center gap-3", children: [_jsxs("button", { type: "button", onClick: () => fileRef.current?.click(), disabled: avatarBusy, className: "relative group rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60", children: [_jsx(Avatar, { className: "h-28 w-28 border-2 border-cyan-400/35 ring-4 ring-cyan-500/10 overflow-hidden transition-transform group-hover:scale-[1.02]", children: user.avatarUrl ? (_jsx("img", { src: user.avatarUrl, alt: "", className: "h-full w-full object-cover" })) : (_jsx(AvatarFallback, { className: "text-2xl bg-white/10 text-white", children: displayName.slice(0, 2).toUpperCase() || "?" })) }), _jsx("span", { className: "absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity", children: _jsx(Camera, { className: "h-8 w-8 text-white" }) }), avatarBusy ? (_jsx("span", { className: "absolute inset-0 flex items-center justify-center rounded-full bg-black/50", children: _jsx(Loader2, { className: "h-8 w-8 text-cyan-300 animate-spin" }) })) : null] }), _jsx("input", { ref: fileRef, type: "file", accept: "image/*", className: "hidden", onChange: (e) => void onAvatarPick(e) }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "button", className: "h-9 px-3 text-sm rounded-xl border border-white/15 bg-white/5 text-white/90", onClick: () => fileRef.current?.click(), disabled: avatarBusy, children: "Bild w\u00E4hlen" }), user.avatarUrl ? (_jsx(Button, { type: "button", variant: "ghost", className: "h-9 px-3 text-sm text-white/50 hover:text-white", onClick: () => void setAvatar(null), disabled: avatarBusy, children: "Entfernen" })) : null] }), _jsx("p", { className: "text-[11px] text-white/40 text-center", children: "Klick auf das Bild zum Hochladen \u00B7 Vorschau sofort sichtbar" })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3", children: [_jsx("div", { className: "text-xs uppercase tracking-wider text-white/40", children: "Identit\u00E4t" }), _jsx("label", { className: "block text-xs text-white/50", children: "Anzeigename" }), _jsx(Input, { value: displayName, onChange: (e) => setDisplayName(e.target.value), className: "bg-white/5 border-white/12 rounded-xl text-white" }), _jsx("label", { className: "block text-xs text-white/50", children: "Kurzstatus (f\u00FCr andere sichtbar)" }), _jsx(Input, { value: statusMessage, onChange: (e) => setStatusMessage(e.target.value), placeholder: "z. B. In einer Besprechung", className: "bg-white/5 border-white/12 rounded-xl text-white placeholder:text-white/30" }), _jsx("label", { className: "block text-xs text-white/50", children: "Bio / Beschreibung" }), _jsx("textarea", { value: bio, onChange: (e) => setBio(e.target.value), rows: 3, className: "w-full rounded-xl bg-white/5 border border-white/12 px-3 py-2 text-sm text-white placeholder:text-white/30 resize-none", placeholder: "Erz\u00E4hl etwas \u00FCber dich\u2026" })] }), _jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3", children: [_jsx("div", { className: "text-xs uppercase tracking-wider text-white/40", children: "Status" }), _jsx("label", { className: "block text-xs text-white/50", children: "Global (Standard)" }), _jsx("select", { value: globalStatus, onChange: (e) => setGlobalStatus(e.target.value), className: "w-full rounded-xl bg-white/5 border border-white/12 px-3 py-2 text-sm text-white", children: STATUS_OPTIONS.map((o) => (_jsx("option", { value: o.value, className: "bg-[#0a1020]", children: o.label }, o.value))) }), _jsxs("label", { className: "block text-xs text-white/50 flex items-center gap-2", children: ["In Bereich \u201E", activeSectionLabel, "\u201C", sectionStatus === "on_call" ? (_jsx("span", { className: "text-[10px] px-1.5 py-0.5 rounded-md bg-red-500/25 text-red-200 animate-pulse", children: "Einsatz" })) : null] }), _jsx("select", { value: sectionStatus, onChange: (e) => setSectionStatus(e.target.value), className: "w-full rounded-xl bg-white/5 border border-white/12 px-3 py-2 text-sm text-white", children: STATUS_OPTIONS.map((o) => (_jsx("option", { value: o.value, className: "bg-[#0a1020]", children: o.label }, o.value))) }), _jsx("p", { className: "text-[11px] text-white/45", children: "\u00DCberschreibt den globalen Status nur in diesem Bereich (z. B. Feuerwehr \u201EIm Einsatz\u201C)." })] }), _jsxs("div", { className: "rounded-2xl border border-violet-400/20 bg-violet-500/[0.07] p-4 space-y-4", children: [_jsxs("div", { className: "flex items-center gap-2 text-xs uppercase tracking-wider text-violet-200/80", children: [_jsx(Shield, { className: "h-3.5 w-3.5" }), "Kontakt & Sichtbarkeit"] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("label", { className: "text-xs text-white/55 flex items-center gap-1.5", children: [_jsx(Mail, { className: "h-3.5 w-3.5 text-cyan-300/80" }), "E-Mail (Profil)"] }), _jsxs("span", { className: "flex items-center gap-1 text-[11px] text-white/50", children: [_jsx(VerifiedIcon, { ok: user.emailVerified }), user.emailVerified ? "verifiziert" : "offen"] })] }), _jsx(Input, { type: "email", value: contactEmail, onChange: (e) => setContactEmail(e.target.value), className: "bg-white/5 border-white/12 rounded-xl text-white" }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("span", { className: "text-[11px] text-white/45", children: "Sichtbarkeit:" }), _jsx("select", { value: emailVis, onChange: (e) => setEmailVis(e.target.value), className: "flex-1 min-w-[10rem] rounded-lg bg-white/5 border border-white/12 px-2 py-1.5 text-xs text-white", children: VIS_OPTIONS.map((v) => (_jsx("option", { value: v.value, className: "bg-[#0a1020]", children: v.label }, v.value))) })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Button, { type: "button", className: "h-8 px-3 text-xs rounded-lg border border-cyan-400/30 bg-transparent text-cyan-100", onClick: async () => {
                                                            setError(null);
                                                            try {
                                                                await startEmailVerification();
                                                                setEmailCodeOpen(true);
                                                                setHint("Demo: Code in der Server-Konsole.");
                                                            }
                                                            catch (err) {
                                                                setError(err instanceof Error ? err.message : "Fehler");
                                                            }
                                                        }, children: "Verifizieren" }), emailCodeOpen ? (_jsxs("div", { className: "flex gap-2 items-center flex-1 min-w-[12rem]", children: [_jsx(Input, { value: emailCode, onChange: (e) => setEmailCode(e.target.value), placeholder: "Code", className: "h-8 text-sm bg-white/5 border-white/12 rounded-lg text-white" }), _jsx(Button, { type: "button", className: "h-8 px-3 text-xs rounded-lg bg-cyan-600/80 text-white shrink-0", onClick: async () => {
                                                                    try {
                                                                        await confirmEmailVerification(emailCode.trim());
                                                                        setEmailCodeOpen(false);
                                                                        setHint("E-Mail verifiziert.");
                                                                    }
                                                                    catch (err) {
                                                                        setError(err instanceof Error ? err.message : "Code ungültig");
                                                                    }
                                                                }, children: "OK" })] })) : null] }), _jsxs("p", { className: "text-[10px] text-white/35", children: ["Login-E-Mail: ", user.email, " (Konto, getrennt von Profil-E-Mail m\u00F6glich)"] })] }), _jsxs("div", { className: "space-y-2 border-t border-white/10 pt-3", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("label", { className: "text-xs text-white/55 flex items-center gap-1.5", children: [_jsx(Phone, { className: "h-3.5 w-3.5 text-fuchsia-300/80" }), "Telefon"] }), _jsxs("span", { className: "flex items-center gap-1 text-[11px] text-white/50", children: [_jsx(VerifiedIcon, { ok: user.phoneVerified }), user.phoneVerified ? "verifiziert" : "offen"] })] }), _jsx(Input, { value: phoneInput, onChange: (e) => setPhoneInput(e.target.value), placeholder: "z. B. 0176 12345678", className: "bg-white/5 border-white/12 rounded-xl text-white" }), _jsxs("p", { className: "text-[11px] text-white/45", children: ["Vorschau (maskiert f\u00FCr andere): ", maskPhoneDigits(phoneInput || user.phoneDigits || "")] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("span", { className: "text-[11px] text-white/45", children: "Sichtbarkeit:" }), _jsx("select", { value: phoneVis, onChange: (e) => setPhoneVis(e.target.value), className: "flex-1 min-w-[10rem] rounded-lg bg-white/5 border border-white/12 px-2 py-1.5 text-xs text-white", children: VIS_OPTIONS.map((v) => (_jsx("option", { value: v.value, className: "bg-[#0a1020]", children: v.label }, v.value))) })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Button, { type: "button", className: "h-8 px-3 text-xs rounded-lg border border-fuchsia-400/30 bg-transparent text-fuchsia-100", onClick: async () => {
                                                            setError(null);
                                                            try {
                                                                await startPhoneVerification();
                                                                setPhoneCodeOpen(true);
                                                                setHint("Demo: SMS-Code in der Server-Konsole.");
                                                            }
                                                            catch (err) {
                                                                setError(err instanceof Error ? err.message : "Fehler");
                                                            }
                                                        }, children: "Verifizieren" }), phoneCodeOpen ? (_jsxs("div", { className: "flex gap-2 items-center flex-1 min-w-[12rem]", children: [_jsx(Input, { value: phoneCode, onChange: (e) => setPhoneCode(e.target.value), placeholder: "Code", className: "h-8 text-sm bg-white/5 border-white/12 rounded-lg text-white" }), _jsx(Button, { type: "button", className: "h-8 px-3 text-xs rounded-lg bg-fuchsia-600/80 text-white shrink-0", onClick: async () => {
                                                                    try {
                                                                        await confirmPhoneVerification(phoneCode.trim());
                                                                        setPhoneCodeOpen(false);
                                                                        setHint("Telefon verifiziert.");
                                                                    }
                                                                    catch (err) {
                                                                        setError(err instanceof Error ? err.message : "Code ungültig");
                                                                    }
                                                                }, children: "OK" })] })) : null] })] })] })] }), _jsxs("div", { className: "flex gap-2 justify-end px-5 py-4 border-t border-white/10 shrink-0 bg-[#050a14]/90", children: [_jsx(Button, { type: "button", variant: "ghost", className: "text-white/70", onClick: onClose, disabled: busy, children: "Schlie\u00DFen" }), _jsx(Button, { type: "button", disabled: busy, className: "rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6", onClick: () => void onSave(), children: busy ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : "Speichern" })] })] }) })) : null }));
}
