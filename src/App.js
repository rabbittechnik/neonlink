import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import NeonLinkMockup from "./NeonLinkMockup";
import FinancePage from "./pages/FinancePage";
import ContractsPage from "./pages/ContractsPage";
import CalendarPage from "./pages/CalendarPage";
import ContactsPage from "./pages/ContactsPage";
import WorkSchedulePage from "./pages/WorkSchedulePage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ImportantDocumentsPage from "./pages/ImportantDocumentsPage";
import VideoMeetingPage from "./pages/VideoMeetingPage";
function LoginGate() {
    const { user, ready } = useAuth();
    if (!ready) {
        return (_jsx("div", { className: "min-h-screen bg-[#050816] flex items-center justify-center text-cyan-200", children: "Laden\u2026" }));
    }
    if (user) {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    return _jsx(LoginPage, {});
}
export default function App() {
    return (_jsx(AuthProvider, { children: _jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginGate, {}) }), _jsx(Route, { path: "/forgot-password", element: _jsx(ForgotPasswordPage, {}) }), _jsx(Route, { path: "/reset-password", element: _jsx(ResetPasswordPage, {}) }), _jsx(Route, { path: "/", element: _jsx(ProtectedRoute, { children: _jsx(NeonLinkMockup, {}) }) }), _jsx(Route, { path: "/finance", element: _jsx(ProtectedRoute, { children: _jsx(FinancePage, {}) }) }), _jsx(Route, { path: "/vertraege", element: _jsx(ProtectedRoute, { children: _jsx(ContractsPage, {}) }) }), _jsx(Route, { path: "/kalender", element: _jsx(ProtectedRoute, { children: _jsx(CalendarPage, {}) }) }), _jsx(Route, { path: "/kontakte", element: _jsx(ProtectedRoute, { children: _jsx(ContactsPage, {}) }) }), _jsx(Route, { path: "/arbeitsplan", element: _jsx(ProtectedRoute, { children: _jsx(WorkSchedulePage, {}) }) }), _jsx(Route, { path: "/wichtige-unterlagen", element: _jsx(ProtectedRoute, { children: _jsx(ImportantDocumentsPage, {}) }) }), _jsx(Route, { path: "/meet/video", element: _jsx(ProtectedRoute, { children: _jsx(VideoMeetingPage, {}) }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) }) }));
}
