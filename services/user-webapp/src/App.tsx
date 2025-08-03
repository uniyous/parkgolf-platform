import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { EnhancedBookingPage } from './pages/EnhancedBookingPage';
import { SearchPage } from './pages/SearchPage';
import { BookingDetailPage } from './pages/BookingDetailPage';
import { BookingCompletePage } from './pages/BookingCompletePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { PrivateRoute } from './components/PrivateRoute';

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