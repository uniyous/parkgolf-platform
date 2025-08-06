import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { PrivateRoute } from './components/PrivateRoute';
import { BookingCompletePage } from './pages/BookingCompletePage';
import { BookingDetailPage } from './pages/BookingDetailPage';
import { EnhancedBookingPage } from './pages/EnhancedBookingPage';
import { LoginPage } from './pages/LoginPage';
import { SearchPage } from './pages/SearchPage';
import { SignupPage } from './pages/SignupPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route element={<PrivateRoute />}>
          <Route path="/search" element={<SearchPage />} />
          <Route path="/booking-detail" element={<BookingDetailPage />} />
          <Route path="/booking-complete" element={<BookingCompletePage />} />
          <Route path="/booking" element={<EnhancedBookingPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;