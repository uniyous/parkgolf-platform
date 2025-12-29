import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { PrivateRoute } from './components';
import {
  LoginPage,
  SignupPage,
  SearchPage,
  BookingDetailPage,
  BookingViewPage,
  BookingCompletePage,
  MyBookingsPage,
} from './pages';

function App() {
  return (
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
        </Route>
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;