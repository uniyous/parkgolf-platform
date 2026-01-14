import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { PrivateRoute } from './components';
import { ConfirmProvider } from './contexts/ConfirmContext';
import {
  LoginPage,
  SignupPage,
  SearchPage,
  BookingDetailPage,
  BookingViewPage,
  BookingCompletePage,
  MyBookingsPage,
  ProfilePage,
} from './pages';

function App() {
  return (
    <ConfirmProvider>
      <Toaster
        position="top-center"
        richColors
        closeButton
        duration={3000}
      />
      <Router>
        <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route element={<PrivateRoute />}>
          <Route path="/search" element={<SearchPage />} />
          <Route path="/my-bookings" element={<MyBookingsPage />} />
          <Route path="/booking/:bookingNumber" element={<BookingViewPage />} />
          <Route path="/booking-detail" element={<BookingDetailPage />} />
          <Route path="/booking-complete" element={<BookingCompletePage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </ConfirmProvider>
  );
}

export default App;