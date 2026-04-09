import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/auth/AuthContext.tsx";
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

function LoginGate() {
  const { user, ready } = useAuth();
  if (!ready) {
    return (
      <div className="min-h-screen bg-[#050816] flex items-center justify-center text-cyan-200">
        Laden…
      </div>
    );
  }
  if (user) {
    return <Navigate to="/" replace />;
  }
  return <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginGate />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <NeonLinkMockup />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance"
            element={
              <ProtectedRoute>
                <FinancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vertraege"
            element={
              <ProtectedRoute>
                <ContractsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kalender"
            element={
              <ProtectedRoute>
                <CalendarPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kontakte"
            element={
              <ProtectedRoute>
                <ContactsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/arbeitsplan"
            element={
              <ProtectedRoute>
                <WorkSchedulePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wichtige-unterlagen"
            element={
              <ProtectedRoute>
                <ImportantDocumentsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
