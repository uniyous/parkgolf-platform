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
import { PoliciesPage } from './pages/PoliciesPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { PartnersPage } from './pages/PartnersPage';
import { FranchiseDashboardPage } from './pages/franchise/FranchiseDashboardPage';
import { FranchiseClubsPage } from './pages/franchise/FranchiseClubsPage';
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
            {/* 가맹점 관리 */}
            <Route path="/franchise" element={<FranchiseDashboardPage />} />
            <Route path="/franchise/companies" element={<CompaniesPage />} />
            <Route path="/franchise/clubs" element={<FranchiseClubsPage />} />
            <Route path="/franchise/partners" element={<PartnersPage />} />
            {/* 기존 URL redirect */}
            <Route path="/companies" element={<Navigate to="/franchise/companies" replace />} />
            <Route path="/partners" element={<Navigate to="/franchise/partners" replace />} />
            {/* 현황 분석 */}
            <Route path="/analytics/bookings" element={<BookingAnalyticsPage />} />
            <Route path="/analytics/clubs" element={<ClubAnalyticsPage />} />
            <Route path="/analytics/revenue" element={<RevenueAnalyticsPage />} />
            {/* 운영 관리 */}
            <Route path="/policies" element={<PoliciesPage />} />
            <Route path="/members" element={<UserManagementPage />} />
            <Route path="/admins" element={<AdminManagementPage />} />
            <Route path="/roles" element={<RolesPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
