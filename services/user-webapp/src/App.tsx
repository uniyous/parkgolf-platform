import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { BookingPage } from './pages/BookingPage';
import { EnhancedBookingPage } from './pages/EnhancedBookingPage';
import { SearchPage } from './pages/SearchPage';
import { BookingDetailPage } from './pages/BookingDetailPage';
import { BookingCompletePage } from './pages/BookingCompletePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { PrivateRoute } from './components/PrivateRoute';

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/search" element={
          <PrivateRoute>
            <SearchPage />
          </PrivateRoute>
        } />
        <Route path="/booking-detail" element={
          <PrivateRoute>
            <BookingDetailPage />
          </PrivateRoute>
        } />
        <Route path="/booking-complete" element={
          <PrivateRoute>
            <BookingCompletePage />
          </PrivateRoute>
        } />
        <Route path="/booking" element={
          <PrivateRoute>
            <EnhancedBookingPage />
          </PrivateRoute>
        } />
        <Route path="/booking-old" element={
          <PrivateRoute>
            <BookingPage />
          </PrivateRoute>
        } />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;