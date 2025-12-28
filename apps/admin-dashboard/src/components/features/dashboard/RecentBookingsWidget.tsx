import React from 'react';
import { useNavigate } from 'react-router-dom';

interface RecentBooking {
  id: number;
  userName: string;
  courseName: string;
  date: string;
  time: string;
  players: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  amount: number;
  createdAt: Date;
}

interface RecentBookingsWidgetProps {
  bookings: RecentBooking[];
}

export const RecentBookingsWidget: React.FC<RecentBookingsWidgetProps> = ({ bookings }) => {
  const navigate = useNavigate();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}시간 전`;
    return `${Math.floor(diffMins / 1440)}일 전`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { label: '대기', color: 'bg-yellow-100 text-yellow-800' };
      case 'CONFIRMED':
        return { label: '확정', color: 'bg-green-100 text-green-800' };
      case 'CANCELLED':
        return { label: '취소', color: 'bg-red-100 text-red-800' };
      case 'COMPLETED':
        return { label: '완료', color: 'bg-gray-100 text-gray-800' };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800' };
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">최근 예약</h3>
          <button
            onClick={() => navigate('/bookings')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            전체 보기 →
          </button>
        </div>

        {/* Bookings List */}
        <div className="space-y-3">
          {bookings.map((booking) => {
            const status = getStatusBadge(booking.status);
            
            return (
              <div 
                key={booking.id}
                className="p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => navigate(`/bookings/${booking.id}`)}
              >
                {/* User and Time */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">
                        {booking.userName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{booking.userName}</p>
                      <p className="text-xs text-gray-500">{formatTime(booking.createdAt)}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </div>

                {/* Course Info */}
                <div className="ml-10">
                  <p className="text-sm text-gray-700">{booking.courseName}</p>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                      <span>{booking.date}</span>
                      <span>{booking.time}</span>
                      <span>{booking.players}명</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(booking.amount)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              대기 중: {bookings.filter(b => b.status === 'PENDING').length}건
            </span>
            <span className="font-medium text-gray-900">
              총 {formatCurrency(bookings.reduce((sum, b) => sum + b.amount, 0))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};