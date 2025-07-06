import React from 'react';
import { useAuth } from '../hooks/useAuth';

export const DashboardPage: React.FC = () => {
  const { currentUser, logout } = useAuth();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Park Golf Dashboard</h1>
        <button onClick={logout} style={styles.logoutButton}>
          Logout
        </button>
      </div>
      
      <div style={styles.content}>
        <h2>Welcome, {currentUser?.username}!</h2>
        <div style={styles.userInfo}>
          <p><strong>User ID:</strong> {currentUser?.id}</p>
          <p><strong>Email:</strong> {currentUser?.email}</p>
          <p><strong>Role:</strong> {currentUser?.role}</p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: '1rem 2rem',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoutButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  content: {
    padding: '2rem',
    maxWidth: '800px',
    margin: '0 auto',
  },
  userInfo: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    marginTop: '1rem',
  },
};