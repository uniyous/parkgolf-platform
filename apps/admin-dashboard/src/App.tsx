import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { PrivateRoute } from './components/PrivateRoute';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { AdminManagementPage } from './pages/system/AdminManagementPage';
import { AdminRoleDemoPage } from './pages/system/AdminRoleDemoPage';
import { UserManagementPage } from './pages/system/UserManagementPage';
import { CompanyPage } from './pages/company/CompanyPage';
import { BookingManagementPage } from './pages/booking/BookingManagementPage';
import { ClubListPage } from './pages/club/ClubListPage';
import { ClubDetailPage } from './pages/club/ClubDetailPage';
import { TimeSlotPage } from './pages/timeslot/TimeSlotPage';
import { useAuthInitialize } from './hooks/useAuth';

function App() {
  // 앱 시작 시 인증 상태 초기화
  useAuthInitialize();

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route element={<PrivateRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin-management" element={<AdminManagementPage />} />
          <Route path="/admin-role-demo" element={<AdminRoleDemoPage />} />
          <Route path="/user-management" element={<UserManagementPage />} />
          <Route path="/companies" element={<CompanyPage />} />
          <Route path="/club" element={<ClubListPage />} />
          <Route path="/club/clubs/:clubId" element={<ClubDetailPage />} />
          <Route path="/club/clubs/:clubId/timeslots" element={<TimeSlotPage />} />
          <Route path="/bookings" element={<BookingManagementPage />} />
          <Route path="/profile" element={
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">프로필 설정</h1>
              <p className="text-gray-600">프로필 설정 페이지입니다.</p>
            </div>
          } />
          <Route path="/change-password" element={
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">비밀번호 변경</h1>
              <p className="text-gray-600">비밀번호 변경 페이지입니다.</p>
            </div>
          } />
          <Route path="/settings/personal" element={
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">개인 설정</h1>
              <p className="text-gray-600">개인 설정 페이지입니다.</p>
            </div>
          } />
          <Route path="/permissions" element={
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">권한 관리</h1>
              <p className="text-gray-600">권한 관리 페이지입니다.</p>
            </div>
          } />
          <Route path="/settings" element={
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">시스템 설정</h1>
              <p className="text-gray-600">시스템 설정 페이지입니다.</p>
            </div>
          } />
          <Route path="/logs" element={
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">로그 관리</h1>
              <p className="text-gray-600">로그 관리 페이지입니다.</p>
            </div>
          } />
          <Route path="/backups" element={
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">백업 관리</h1>
              <p className="text-gray-600">백업 관리 페이지입니다.</p>
            </div>
          } />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;