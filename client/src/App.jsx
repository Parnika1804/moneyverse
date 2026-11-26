import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import DashboardLayout from './components/DashboardLayout.jsx';
import LandingPage from './pages/LandingPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import LogoutPage from './pages/LogoutPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import PersonalFinancePage from './pages/PersonalFinancePage.jsx';
import ModulePlaceholderPage from './pages/ModulePlaceholderPage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/logout" element={<LogoutPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="personal-finance" element={<PersonalFinancePage />} />
            <Route
              path="business-simulation"
              element={<ModulePlaceholderPage moduleKey="business-simulation" />}
            />
            <Route
              path="learning-hub"
              element={<ModulePlaceholderPage moduleKey="learning-hub" />}
            />
            <Route
              path="ai-mentor"
              element={<ModulePlaceholderPage moduleKey="ai-mentor" />}
            />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
