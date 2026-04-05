import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
export default function ProtectedRoute({ children }) {
    const { user, ready } = useAuth();
    const location = useLocation();
    if (!ready) {
        return (_jsx("div", { className: "min-h-screen bg-[#050816] flex items-center justify-center text-cyan-200 text-sm", children: "Sitzung wird gepr\u00FCft\u2026" }));
    }
    if (!user) {
        return _jsx(Navigate, { to: "/login", replace: true, state: { from: location.pathname } });
    }
    return _jsx(_Fragment, { children: children });
}
