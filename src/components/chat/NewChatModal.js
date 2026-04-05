import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Globe, User, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function NewChatModal({ open, onClose, sectionLabel, membersExcludingSelf, onCreatePrivate, onCreateGroup, }) {
    const [step, setStep] = useState("type");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [privatePick, setPrivatePick] = useState(null);
    const [groupName, setGroupName] = useState("");
    const [groupPicks, setGroupPicks] = useState({});
    const reset = () => {
        setStep("type");
        setError(null);
        setPrivatePick(null);
        setGroupName("");
        setGroupPicks({});
    };
    const handleClose = () => {
        if (busy)
            return;
        reset();
        onClose();
    };
    if (!open)
        return null;
    const toggleGroupMember = (id) => {
        setGroupPicks((prev) => ({ ...prev, [id]: !prev[id] }));
    };
    const submitPrivate = async () => {
        if (!privatePick) {
            setError("Bitte eine Person waehlen.");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await onCreatePrivate(privatePick);
            handleClose();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Privatchat fehlgeschlagen.");
        }
        finally {
            setBusy(false);
        }
    };
    const submitGroup = async () => {
        const name = groupName.trim();
        if (!name) {
            setError("Bitte einen Gruppennamen eingeben.");
            return;
        }
        const ids = Object.entries(groupPicks)
            .filter(([, v]) => v)
            .map(([k]) => k);
        if (ids.length === 0) {
            setError("Mindestens ein Mitglied auswaehlen.");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await onCreateGroup(name, ids);
            handleClose();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Gruppe konnte nicht erstellt werden.");
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsx("div", { className: "fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm", role: "dialog", "aria-modal": "true", "aria-labelledby": "new-chat-title", children: _jsxs("div", { className: "w-full max-w-md rounded-3xl border border-white/15 bg-[#0a1020] shadow-2xl shadow-cyan-500/10 overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10", children: [_jsx("h2", { id: "new-chat-title", className: "text-lg font-semibold text-white", children: "Neuen Chat erstellen" }), _jsx("button", { type: "button", onClick: handleClose, disabled: busy, className: "p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-40", "aria-label": "Schliessen", children: _jsx(X, { className: "h-5 w-5" }) })] }), _jsxs("div", { className: "px-5 py-4 space-y-4 max-h-[min(70vh,520px)] overflow-y-auto", children: [_jsxs("p", { className: "text-sm text-white/50", children: ["Bereich: ", _jsx("span", { className: "text-cyan-200/90", children: sectionLabel })] }), error ? (_jsx("div", { className: "rounded-2xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200", children: error })) : null, step === "type" && (_jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "text-xs uppercase tracking-wider text-white/40", children: "Schritt 1 \u2014 Typ" }), _jsxs("button", { type: "button", onClick: () => {
                                        setStep("private");
                                        setError(null);
                                    }, className: "w-full flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition-colors", children: [_jsx(User, { className: "h-5 w-5 text-fuchsia-300 shrink-0" }), _jsxs("div", { children: [_jsx("div", { className: "font-medium text-white", children: "Privatchat" }), _jsx("div", { className: "text-xs text-white/50", children: "1:1 mit einem Workspace-Mitglied" })] })] }), _jsxs("button", { type: "button", onClick: () => {
                                        setStep("group");
                                        setError(null);
                                    }, className: "w-full flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition-colors", children: [_jsx(Users, { className: "h-5 w-5 text-cyan-300 shrink-0" }), _jsxs("div", { children: [_jsx("div", { className: "font-medium text-white", children: "Gruppenchat" }), _jsx("div", { className: "text-xs text-white/50", children: "Name und Mitglieder festlegen" })] })] }), _jsxs("div", { className: "flex items-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-3 text-white/35 text-sm", children: [_jsx(Globe, { className: "h-4 w-4 shrink-0" }), _jsx("span", { children: "Hauptchat je Bereich ist fest \u2014 weitere oeffentliche Kanaele folgen spaeter." })] })] })), step === "private" && (_jsxs("div", { className: "space-y-3", children: [_jsx("button", { type: "button", onClick: () => {
                                        setStep("type");
                                        setError(null);
                                    }, className: "text-xs text-cyan-300 hover:underline", children: "Zurueck" }), _jsx("div", { className: "text-xs uppercase tracking-wider text-white/40", children: "Mitglied waehlen" }), membersExcludingSelf.length === 0 ? (_jsx("p", { className: "text-sm text-white/45", children: "Keine anderen Mitglieder in diesem Workspace." })) : (_jsx("ul", { className: "space-y-1 max-h-48 overflow-y-auto pr-1", children: membersExcludingSelf.map((m) => (_jsx("li", { children: _jsxs("label", { className: "flex items-center gap-3 rounded-xl px-3 py-2 cursor-pointer hover:bg-white/5", children: [_jsx("input", { type: "radio", name: "private-peer", checked: privatePick === m.id, onChange: () => setPrivatePick(m.id), className: "accent-cyan-400" }), _jsx("span", { className: "text-sm text-white/90", children: m.displayName })] }) }, m.id))) })), _jsx(Button, { type: "button", disabled: busy || membersExcludingSelf.length === 0, className: "w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white", onClick: () => void submitPrivate(), children: busy ? "…" : "Chat oeffnen" })] })), step === "group" && (_jsxs("div", { className: "space-y-3", children: [_jsx("button", { type: "button", onClick: () => {
                                        setStep("type");
                                        setError(null);
                                    }, className: "text-xs text-cyan-300 hover:underline", children: "Zurueck" }), _jsxs("div", { children: [_jsx("div", { className: "text-xs uppercase tracking-wider text-white/40 mb-1.5", children: "Gruppenname" }), _jsx(Input, { value: groupName, onChange: (e) => setGroupName(e.target.value), placeholder: "z. B. Urlaub, Trupp 1", className: "bg-white/5 border-white/15 rounded-2xl text-white placeholder:text-white/35" })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs uppercase tracking-wider text-white/40 mb-1.5", children: "Mitglieder" }), membersExcludingSelf.length === 0 ? (_jsx("p", { className: "text-sm text-white/45", children: "Keine anderen Mitglieder verfuegbar." })) : (_jsx("ul", { className: "space-y-1 max-h-40 overflow-y-auto pr-1", children: membersExcludingSelf.map((m) => (_jsx("li", { children: _jsxs("label", { className: "flex items-center gap-3 rounded-xl px-3 py-2 cursor-pointer hover:bg-white/5", children: [_jsx("input", { type: "checkbox", checked: Boolean(groupPicks[m.id]), onChange: () => toggleGroupMember(m.id), className: "accent-cyan-400 rounded" }), _jsx("span", { className: "text-sm text-white/90", children: m.displayName })] }) }, m.id))) }))] }), _jsx(Button, { type: "button", disabled: busy || membersExcludingSelf.length === 0, className: "w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white", onClick: () => void submitGroup(), children: busy ? "…" : "Gruppe erstellen" })] }))] })] }) }));
}
