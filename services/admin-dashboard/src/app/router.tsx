import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { SignupPage } from '../pages/SignupPage';
import { DashboardPage } from '../pages/DashboardPage';
import { CourseManagementPage } from '../pages/CourseManagementPage';
import { AdminManagementPage } from '../pages/AdminManagementPage';
import { CompanyManagementPage } from '../pages/CompanyManagementPage';
import { BookingManagementPage } from '../pages/BookingManagementPage';
import { TimeSlotManagementPage } from '../components/timeslot/TimeSlotManagementPage';
import { BookingManagement } from '../components/booking/BookingManagement';
import { AppLayout } from '../components/common/Layout/AppLayout';
import { useAuth } from '../redux/hooks/useAuth';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <AppLayout>
      {children}
    </AppLayout>
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
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />
        
        <Route path="/course-management" element={
          <ProtectedRoute>
            <CourseManagementPage />
          </ProtectedRoute>
        } />
        
        <Route path="/admin-management" element={
          <ProtectedRoute>
            <AdminManagementPage />
          </ProtectedRoute>
        } />

        {/* 회사 관리 */}
        <Route path="/companies" element={
          <ProtectedRoute>
            <CompanyManagementPage />
          </ProtectedRoute>
        } />

        {/* 타임슬롯 관리 */}
        <Route path="/courses/:courseId/timeslots" element={
          <ProtectedRoute>
            <TimeSlotManagementPage />
          </ProtectedRoute>
        } />

        {/* 예약 관리 메인 페이지 */}
        <Route path="/bookings" element={
          <ProtectedRoute>
            <BookingManagementPage />
          </ProtectedRoute>
        } />

        {/* 특정 코스 예약 관리 */}
        <Route path="/courses/:courseId/bookings" element={
          <ProtectedRoute>
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