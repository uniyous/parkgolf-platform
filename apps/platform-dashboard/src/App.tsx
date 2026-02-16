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
            <Route path="/analytics/bookings" element={<BookingAnalyticsPage />} />
            <Route path="/analytics/clubs" element={<ClubAnalyticsPage />} />
            <Route path="/analytics/revenue" element={<RevenueAnalyticsPage />} />
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
