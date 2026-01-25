import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { PrivateRoute } from './components';
import { ConfirmProvider } from './contexts/ConfirmContext';
import {
  LoginPage,
  SignupPage,
  HomePage,
  SearchPage,
  BookingsPage,
  BookingDetailPage,
  BookingViewPage,
  BookingCompletePage,
  MyBookingsPage,
  ProfilePage,
  SocialPage,
  ChatRoomPage,
  ChangePasswordPage,
} from './pages';

function App() {
  return (
    <ConfirmProvider>
      <Toaster
        position="top-center"
        richColors
        closeButton
        duration={3000}
        toastOptions={{
          style: {
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          },
        }}
      />
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/my-bookings" element={<MyBookingsPage />} />
            <Route path="/booking/:bookingNumber" element={<BookingViewPage />} />
            <Route path="/booking-detail" element={<BookingDetailPage />} />
            <Route path="/booking-complete" element={<BookingCompletePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/social" element={<SocialPage />} />
            <Route path="/friends" element={<Navigate to="/social" replace />} />
            <Route path="/chat" element={<Navigate to="/social?tab=chat" replace />} />
            <Route path="/chat/:roomId" element={<ChatRoomPage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ConfirmProvider>
  );
}

export default App;
