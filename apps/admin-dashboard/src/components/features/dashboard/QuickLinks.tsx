import React from 'react';
import { useNavigate } from 'react-router-dom';

interface QuickLink {
  label: string;
  path: string;
  icon: React.ReactNode;
  description: string;
}

const CalendarIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const BuildingIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const quickLinks: QuickLink[] = [
  {
    label: '예약 관리',
    path: '/bookings',
    icon: <CalendarIcon />,
    description: '예약 현황 조회 및 관리',
  },
  {
    label: '클럽 관리',
    path: '/clubs',
    icon: <BuildingIcon />,
    description: '골프 클럽 정보 관리',
  },
  {
    label: '회원 관리',
    path: '/user-management',
    icon: <UsersIcon />,
    description: '회원 정보 조회 및 관리',
  },
];

export const QuickLinks: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">바로가기</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickLinks.map((link) => (
          <button
            key={link.path}
            onClick={() => navigate(link.path)}
            className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors text-left"
          >
            <div className="flex-shrink-0 p-2 bg-blue-50 rounded-lg text-blue-600">
              {link.icon}
            </div>
            <div>
              <p className="font-medium text-gray-900">{link.label}</p>
              <p className="text-sm text-gray-500">{link.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
