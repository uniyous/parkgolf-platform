import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { SignupPage } from '../pages/SignupPage';
import { DashboardPage } from '../pages/DashboardPage';
import { CourseManagementPage } from '../pages/CourseManagementPage';
import { AdminManagementPage } from '../pages/AdminManagementPage';
import { UserManagementPage } from '../pages/UserManagementPage';
import { CompanyManagementPage } from '../pages/CompanyManagementPage';
import { BookingManagementPage } from '../pages/BookingManagementPage';
import { TimeSlotManagementPage } from '../components/timeslot/TimeSlotManagementPage';
import { NewTimeSlotManagementPage } from '../pages/NewTimeSlotManagementPage';
import { BookingManagement } from '../components/booking/BookingManagement';
import { AppLayout } from '../components/common/Layout/AppLayout';
import { NewAppLayout } from '../components/common/Layout/NewAppLayout';
import { useAuth } from '../redux/hooks/useAuth';

const ProtectedRoute = ({ children, useNewLayout = false }: { children: React.ReactNode; useNewLayout?: boolean }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  const Layout = useNewLayout ? NewAppLayout : AppLayout;
  
  return (
    <Layout>
      {children}
    </Layout>
  );
};

export const AppRouter = () => {
  const { isAuthenticated } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        {/* 공개 라우트 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        
        {/* 루트 경로 리다이렉트 */}
        <Route 
          path="/" 
          element={
            isAuthenticated ? 
              <Navigate to="/dashboard" replace /> : 
              <Navigate to="/login" replace />
          } 
        />
        
        {/* 보호된 라우트들 */}
        <Route path="/dashboard" element={
          <ProtectedRoute useNewLayout={true}>
            <DashboardPage />
          </ProtectedRoute>
        } />
        
        <Route path="/course-management" element={
          <ProtectedRoute useNewLayout={true}>
            <CourseManagementPage />
          </ProtectedRoute>
        } />
        
        <Route path="/admin-management" element={
          <ProtectedRoute useNewLayout={true}>
            <AdminManagementPage />
          </ProtectedRoute>
        } />

        <Route path="/user-management" element={
          <ProtectedRoute useNewLayout={true}>
            <UserManagementPage />
          </ProtectedRoute>
        } />

        {/* 회사 관리 */}
        <Route path="/companies" element={
          <ProtectedRoute useNewLayout={true}>
            <CompanyManagementPage />
          </ProtectedRoute>
        } />

        {/* 타임슬롯 관리 (기존) */}
        <Route path="/courses/:courseId/timeslots" element={
          <ProtectedRoute useNewLayout={true}>
            <TimeSlotManagementPage />
          </ProtectedRoute>
        } />

        {/* 타임슬롯 관리 (신규) */}
        <Route path="/timeslots" element={
          <ProtectedRoute useNewLayout={true}>
            <NewTimeSlotManagementPage />
          </ProtectedRoute>
        } />

        {/* 프로필 관리 */}
        <Route path="/profile" element={
          <ProtectedRoute useNewLayout={true}>
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">프로필 설정</h1>
              <p className="text-gray-600">프로필 설정 페이지입니다.</p>
            </div>
          </ProtectedRoute>
        } />

        <Route path="/change-password" element={
          <ProtectedRoute useNewLayout={true}>
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">비밀번호 변경</h1>
              <p className="text-gray-600">비밀번호 변경 페이지입니다.</p>
            </div>
          </ProtectedRoute>
        } />

        <Route path="/settings/personal" element={
          <ProtectedRoute useNewLayout={true}>
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">개인 설정</h1>
              <p className="text-gray-600">개인 설정 페이지입니다.</p>
            </div>
          </ProtectedRoute>
        } />

        <Route path="/permissions" element={
          <ProtectedRoute useNewLayout={true}>
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">권한 관리</h1>
              <p className="text-gray-600">권한 관리 페이지입니다.</p>
            </div>
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute useNewLayout={true}>
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">시스템 설정</h1>
              <p className="text-gray-600">시스템 설정 페이지입니다.</p>
            </div>
          </ProtectedRoute>
        } />

        <Route path="/logs" element={
          <ProtectedRoute useNewLayout={true}>
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">로그 관리</h1>
              <p className="text-gray-600">로그 관리 페이지입니다.</p>
            </div>
          </ProtectedRoute>
        } />

        <Route path="/backups" element={
          <ProtectedRoute useNewLayout={true}>
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">백업 관리</h1>
              <p className="text-gray-600">백업 관리 페이지입니다.</p>
            </div>
          </ProtectedRoute>
        } />

        {/* 예약 관리 메인 페이지 */}
        <Route path="/bookings" element={
          <ProtectedRoute useNewLayout={true}>
            <BookingManagementPage />
          </ProtectedRoute>
        } />

        {/* 특정 코스 예약 관리 */}
        <Route path="/courses/:courseId/bookings" element={
          <ProtectedRoute useNewLayout={true}>
            <BookingManagement />
          </ProtectedRoute>
        } />
        
        {/* 404 처리 */}
        <Route path="*" element={
          isAuthenticated ? 
            <Navigate to="/dashboard" replace /> : 
            <Navigate to="/login" replace />
        } />
      </Routes>
    </BrowserRouter>
  );
};