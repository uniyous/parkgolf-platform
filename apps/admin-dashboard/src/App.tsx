import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { PrivateRoute } from '@/components/auth';
import { GlobalLoading } from '@/components/common';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { AdminManagementPage } from './pages/system/AdminManagementPage';
import { UserManagementPage } from './pages/system/UserManagementPage';
import { RolePermissionPage } from './pages/system/RolePermissionPage';
import { CompanyPage } from './pages/company/CompanyPage';
import { BookingManagementPage } from './pages/booking/BookingManagementPage';
import { ClubListPage } from './pages/club/ClubListPage';
import { ClubDetailPage } from './pages/club/ClubDetailPage';
import { GameListPage } from './pages/game/GameListPage';
import { GameDetailPage } from './pages/game/GameDetailPage';
import { useAuthInitialize } from './hooks/useAuth';

function App() {
  // 앱 시작 시 인증 상태 초기화
  const { isInitializing } = useAuthInitialize();

  // 인증 상태 초기화 중 로딩 표시
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
        <Route path="/signup" element={<SignupPage />} />
        <Route element={<PrivateRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin-management" element={<AdminManagementPage />} />
          <Route path="/user-management" element={<UserManagementPage />} />
          <Route path="/roles" element={<RolePermissionPage />} />
          <Route path="/companies" element={<CompanyPage />} />

          {/* 골프장 관리 (Master Data) */}
          <Route path="/clubs" element={<ClubListPage />} />
          <Route path="/clubs/:clubId" element={<ClubDetailPage />} />

          {/* 라운드 관리 (Game) */}
          <Route path="/games" element={<GameListPage />} />
          <Route path="/games/:gameId" element={<GameDetailPage />} />

          {/* 하위 호환 리다이렉트 */}
          <Route path="/club" element={<Navigate to="/clubs" replace />} />
          <Route path="/club/clubs/:clubId" element={<ClubDetailPage />} />
          <Route path="/club/clubs/:clubId/timeslots" element={<Navigate to="/games" replace />} />

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
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
    </>
  );
}

export default App;