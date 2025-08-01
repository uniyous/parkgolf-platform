import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_ROLE_LABELS, ADMIN_ROLE_COLORS } from '../../../utils/adminPermissions';
import type { AdminRole } from '../../../types';

interface UserDropdownProps {
  currentUser: {
    username: string;
    email: string;
    role?: string;
    company?: string;
  };
  onLogout: () => void;
}

export const UserDropdown: React.FC<UserDropdownProps> = ({ currentUser, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ESC 키로 드롭다운 닫기
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleLogoutClick = () => {
    setIsOpen(false);
    onLogout();
  };

  const menuItems = [
    {
      icon: '👤',
      label: '프로필 설정',
      href: '/profile',
      description: '개인 정보 수정'
    },
    {
      icon: '🔐',
      label: '비밀번호 변경',
      href: '/change-password',
      description: '비밀번호 변경'
    },
    {
      icon: '⚙️',
      label: '개인 설정',
      href: '/settings/personal',
      description: '개인 환경 설정'
    },
    { divider: true },
    {
      icon: '🚪',
      label: '로그아웃',
      action: handleLogoutClick,
      description: '시스템에서 로그아웃'
    }
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 드롭다운 트리거 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
      >
        {/* 프로필 이미지 */}
        <div className="flex-shrink-0">
          <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
            <span className="text-sm font-medium text-white">
              {currentUser.username ? currentUser.username.charAt(0).toUpperCase() : 'A'}
            </span>
          </div>
        </div>

        {/* 사용자 정보 */}
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium text-gray-900">
            {currentUser.username}
          </div>
          <div className="text-xs text-gray-500">
            {currentUser.email}
          </div>
          {currentUser.role && (
            <div className="mt-1">
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                ADMIN_ROLE_COLORS[currentUser.role as AdminRole] || 'bg-gray-100 text-gray-800'
              }`}>
                {ADMIN_ROLE_LABELS[currentUser.role as AdminRole] || currentUser.role}
              </span>
            </div>
          )}
        </div>

        {/* 드롭다운 화살표 */}
        <svg 
          className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {/* 헤더 */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-lg font-medium text-white">
                  {currentUser.username ? currentUser.username.charAt(0).toUpperCase() : 'A'}
                </span>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  {currentUser.username}
                </div>
                <div className="text-xs text-gray-500">
                  {currentUser.email}
                </div>
                {currentUser.role && (
                  <div className="mt-2 flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      ADMIN_ROLE_COLORS[currentUser.role as AdminRole] || 'bg-gray-100 text-gray-800'
                    }`}>
                      {ADMIN_ROLE_LABELS[currentUser.role as AdminRole] || currentUser.role}
                    </span>
                    {currentUser.company && (
                      <span className="text-xs text-gray-500">
                        • {currentUser.company}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 메뉴 아이템들 */}
          <div className="py-1">
            {menuItems.map((item, index) => {
              // 구분선 렌더링
              if (item.divider) {
                return (
                  <div key={index} className="my-1 border-t border-gray-200" />
                );
              }

              // 액션 아이템 (로그아웃)
              if (item.action) {
                return (
                  <button
                    key={index}
                    onClick={item.action}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 transition-colors"
                  >
                    <span className="mr-3 text-lg">{item.icon}</span>
                    <div className="text-left">
                      <div className="font-medium">{item.label}</div>
                      {item.description && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </button>
                );
              }

              // 링크 아이템
              return (
                <Link
                  key={index}
                  to={item.href!}
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  <div>
                    <div className="font-medium">{item.label}</div>
                    {item.description && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {item.description}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* 푸터 */}
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-500">
              마지막 로그인: {new Date().toLocaleString('ko-KR')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};