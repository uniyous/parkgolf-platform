import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { BookingPage } from './pages/BookingPage';
import { EnhancedBookingPage } from './pages/EnhancedBookingPage';
import { SearchPage } from './pages/SearchPage';
import { BookingDetailPage } from './pages/BookingDetailPage';
import { BookingCompletePage } from './pages/BookingCompletePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';

function App() {
  return (
    <AuthProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/booking-detail" element={<BookingDetailPage />} />
          <Route path="/booking-complete" element={<BookingCompletePage />} />
          <Route path="/booking" element={<EnhancedBookingPage />} />
          <Route path="/booking-old" element={<BookingPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;