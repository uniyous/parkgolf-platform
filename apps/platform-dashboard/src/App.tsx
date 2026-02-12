import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { PrivateRoute } from '@/components/auth';
import { GlobalLoading } from '@/components/common';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { AdminManagementPage } from './pages/AdminManagementPage';
import { RolesPage } from './pages/RolesPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { SystemSettingsPage } from './pages/SystemSettingsPage';
import { BookingAnalyticsPage } from './pages/analytics/BookingAnalyticsPage';
import { ClubAnalyticsPage } from './pages/analytics/ClubAnalyticsPage';
import { RevenueAnalyticsPage } from './pages/analytics/RevenueAnalyticsPage';
import { useAuthInitialize } from './hooks/useAuth';

function App() {
  const { isInitializing } = useAuthInitialize();

  if (isInitializing) {
    return <GlobalLoading />;
  }

  return (
    <>
      <Toaster
        position="top-right"
        richColors
        closeButton
        duration={3000}
      />
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<PrivateRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/companies" element={<CompaniesPage />} />
            <Route path="/admin-management" element={<AdminManagementPage />} />
            <Route path="/roles" element={<RolesPage />} />
            <Route path="/user-management" element={<UserManagementPage />} />
            <Route path="/system-settings" element={<SystemSettingsPage />} />
            <Route path="/analytics/bookings" element={<BookingAnalyticsPage />} />
            <Route path="/analytics/clubs" element={<ClubAnalyticsPage />} />
            <Route path="/analytics/revenue" element={<RevenueAnalyticsPage />} />
            <Route path="/support" element={
              <div className="text-center py-12">
                <h1 className="text-2xl font-bold text-white mb-4">가맹점 지원</h1>
                <p className="text-white/60 mb-4">가맹점을 선택하여 운영을 지원합니다.</p>
                <a
                  href="http://localhost:3001"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                >
                  Admin Dashboard 열기
                </a>
              </div>
            } />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
