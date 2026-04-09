import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export function JoinByCodeCard({ onAddFriendByCode, highlight }) {
    const [code, setCode] = useState("");
    const [busy, setBusy] = useState(false);
    const submit = () => {
        const c = code.trim();
        if (!c)
            return;
        setBusy(true);
        Promise.resolve(onAddFriendByCode(c)).finally(() => setBusy(false));
    };
    return (_jsxs(Card, { id: "friends-join-by-code", className: `rounded-3xl border text-white backdrop-blur-xl shadow-lg shadow-black/25 transition-[box-shadow,border-color] duration-300 ${highlight
            ? "border-cyan-400/50 bg-gradient-to-br from-cyan-500/15 to-white/[0.04] ring-2 ring-cyan-400/25"
            : "border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02]"}`, children: [_jsx(CardHeader, { className: "pb-2", children: _jsxs(CardTitle, { className: "text-sm font-semibold flex items-center gap-2", children: [_jsx(UserPlus, { className: "h-4 w-4 text-cyan-300" }), "Freund per Code"] }) }), _jsxs(CardContent, { className: "space-y-2 pt-0", children: [_jsx("label", { className: "sr-only", htmlFor: "friends-add-by-code", children: "Freundescode" }), _jsx(Input, { id: "friends-add-by-code", value: code, onChange: (e) => setCode(e.target.value), onKeyDown: (e) => {
                            if (e.key === "Enter")
                                submit();
                        }, placeholder: "z. B. NLF-ABC123", className: "w-full min-w-0 bg-white/5 border-white/10 rounded-xl h-10 text-sm placeholder:text-white/55 font-mono" }), _jsx(Button, { type: "button", disabled: busy || !code.trim(), onClick: submit, className: "w-full h-9 rounded-xl border border-cyan-400/35 bg-cyan-500/20 text-cyan-50 hover:bg-cyan-500/30 text-xs", children: busy ? "Wird gesendet…" : "Beitreten / Anfrage senden" }), _jsx("p", { className: "text-[10px] font-medium text-white/90 leading-snug", children: "Wir suchen den Nutzer und senden eine Freundschaftsanfrage \u2014 du wirst benachrichtigt, wenn er sie annimmt." })] })] }));
}
