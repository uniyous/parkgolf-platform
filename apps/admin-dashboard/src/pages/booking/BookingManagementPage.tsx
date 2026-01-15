import React from 'react';
import { BookingList } from '@/components/features/booking';

export const BookingManagementPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <BookingList />
    </div>
  );
};

export default BookingManagementPage;
