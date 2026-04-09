import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Mail, Phone, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/auth/AuthContext";
const STATUS_LABEL = {
    online: "Online",
    away: "Abwesend",
    busy: "Beschäftigt",
    offline: "Offline",
    on_call: "Im Einsatz",
};
function statusLabel(s) {
    if (s in STATUS_LABEL)
        return STATUS_LABEL[s];
    return s;
}
export function PeerProfileModal({ userId, onClose }) {
    const { authFetch } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const open = Boolean(userId);
    useEffect(() => {
        if (!userId) {
            setData(null);
            setError(null);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setError(null);
        void authFetch(`/users/${userId}/profile`)
            .then(async (res) => {
            if (!res.ok)
                throw new Error("profile_failed");
            return res.json();
        })
            .then((json) => {
            if (!cancelled)
                setData(json);
        })
            .catch(() => {
            if (!cancelled)
                setError("Profil konnte nicht geladen werden.");
        })
            .finally(() => {
            if (!cancelled)
                setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [userId, authFetch]);
    const isPrivate = data != null && !Object.prototype.hasOwnProperty.call(data, "bio");
    return (_jsx(AnimatePresence, { children: open ? (_jsxs(motion.div, { className: "fixed inset-0 z-[120] flex items-center justify-center p-4", initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, children: [_jsx("button", { type: "button", className: "absolute inset-0 bg-black/70 backdrop-blur-sm", "aria-label": "Schlie\u00DFen", onClick: onClose }), _jsxs(motion.div, { role: "dialog", "aria-modal": "true", "aria-labelledby": "peer-profile-title", className: "relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-[#0a1020]/95 text-white shadow-2xl shadow-black/50 backdrop-blur-xl overflow-hidden", initial: { scale: 0.96, y: 12 }, animate: { scale: 1, y: 0 }, exit: { scale: 0.96, y: 12 }, children: [_jsxs("div", { className: "flex items-center justify-between border-b border-white/10 px-5 py-3", children: [_jsx("h2", { id: "peer-profile-title", className: "text-sm font-semibold tracking-wide text-white", children: "Profil" }), _jsx(Button, { type: "button", variant: "ghost", className: "h-9 w-9 rounded-full text-white hover:text-white hover:bg-white/10 p-0", onClick: onClose, children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsx("div", { className: "p-5 max-h-[min(70vh,520px)] overflow-y-auto", children: loading ? (_jsxs("div", { className: "flex flex-col items-center justify-center gap-3 py-12 text-white", children: [_jsx(Loader2, { className: "h-8 w-8 animate-spin text-cyan-400" }), _jsx("p", { className: "text-sm", children: "Lade Profil \u2026" })] })) : error ? (_jsx("p", { className: "text-sm text-red-300/90 text-center py-8", children: error })) : data ? (_jsxs("div", { className: "space-y-4", children: [isPrivate ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "text-center text-base font-semibold text-white", children: data.displayName }), _jsx("p", { className: "text-sm text-white text-center py-2 leading-relaxed", children: "Dieses Profil ist privat \u2014 du hast keinen Zugriff auf weitere Angaben." })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx(Avatar, { className: "h-16 w-16 overflow-hidden rounded-2xl border border-white/15", children: data.avatarUrl ? (_jsx("img", { src: data.avatarUrl, alt: "", className: "h-full w-full object-cover" })) : (_jsx(AvatarFallback, { className: "flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-500/30 to-violet-500/20 text-lg", children: data.displayName.slice(0, 2).toUpperCase() })) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "text-lg font-semibold truncate", children: data.displayName }), _jsx("div", { className: "text-xs text-white/90 mt-0.5", children: statusLabel(data.status) }), data.friendCode ? (_jsxs("div", { className: "text-[11px] text-white/90 mt-1 font-mono", children: ["Code: ", data.friendCode] })) : null] })] }), data.statusMessage?.trim() ? (_jsx("div", { className: "rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white", children: data.statusMessage.trim() })) : null, data.bio?.trim() ? (_jsxs("div", { children: [_jsx("div", { className: "text-[10px] font-semibold uppercase tracking-wider text-white/90 mb-1", children: "\u00DCber mich" }), _jsx("p", { className: "text-sm text-white whitespace-pre-wrap leading-relaxed", children: data.bio.trim() })] })) : null, data.contactEmail ? (_jsxs("div", { className: "flex items-start gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm", children: [_jsx(Mail, { className: "h-4 w-4 text-cyan-200 shrink-0 mt-0.5" }), _jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "truncate text-white", children: data.contactEmail }), data.emailVerified != null ? (_jsxs("div", { className: "text-[11px] text-white/90", children: ["E-Mail: ", data.emailVerified ? "verifiziert" : "nicht verifiziert"] })) : null] })] })) : null, data.phoneMasked ? (_jsxs("div", { className: "flex items-start gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm", children: [_jsx(Phone, { className: "h-4 w-4 text-cyan-200 shrink-0 mt-0.5" }), _jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "text-white", children: data.phoneMasked }), data.phoneVerified != null ? (_jsxs("div", { className: "text-[11px] text-white/90", children: ["Telefon: ", data.phoneVerified ? "verifiziert" : "nicht verifiziert"] })) : null] })] })) : null] })), isPrivate ? (_jsx("div", { className: "flex justify-center pt-2", children: _jsx(User, { className: "h-10 w-10 text-white/70", "aria-hidden": true }) })) : null] })) : null })] })] })) : null }));
}
