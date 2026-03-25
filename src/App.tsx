import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import HomePage from "./pages/HomePage";
import InsightsPage from "./pages/InsightsPage";
import SettingsPage from "./pages/SettingsPage";
import SummaryPage from "./pages/SummaryPage";
import TodayPage from "./pages/TodayPage";
import TriggersPage from "./pages/TriggersPage";

function ProtectedLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Opening your journal...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function RootLanding() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Opening your journal...</div>;
  }

  if (user) {
    return <Navigate to="/app/today" replace />;
  }

  return <HomePage />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<RootLanding />} />
        <Route path="/app" element={<ProtectedLayout />}>
          <Route index element={<Navigate to="/app/today" replace />} />
          <Route path="today" element={<TodayPage />} />
          <Route path="triggers" element={<TriggersPage />} />
          <Route path="insights" element={<InsightsPage />} />
          <Route path="summary" element={<SummaryPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
