import React from 'react';
import { UserManagementContainer } from '../components/user';

export const UserManagementPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <UserManagementContainer />
    </div>
  );
};