import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { ADMIN_ROLE_LABELS, ADMIN_ROLE_COLORS } from '@/utils';
import type { AdminRole } from '@/types';

interface UserMenuProps {
  currentUser: {
    username: string;
    email: string;
    role?: string;
    company?: string;
  };
  onLogout: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ currentUser, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 또는 ESC 키로 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const menuItems = [
    { icon: '👤', label: '프로필 설정', href: '/profile' },
    { icon: '🔐', label: '비밀번호 변경', href: '/change-password' },
    { icon: '⚙️', label: '개인 설정', href: '/settings/personal' },
  ];

  const roleLabel = ADMIN_ROLE_LABELS[currentUser.role as AdminRole] || currentUser.role;
  const roleColor = ADMIN_ROLE_COLORS[currentUser.role as AdminRole] || 'bg-white/10 text-white';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 트리거 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/10 transition-colors"
      >
        <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center">
          <span className="text-sm font-medium text-white">
            {currentUser.username?.charAt(0).toUpperCase() || 'A'}
          </span>
        </div>
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium text-white">{currentUser.username}</div>
          {currentUser.role && (
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${roleColor}`}>
              {roleLabel}
            </span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white/10 backdrop-blur-xl border border-white/15 rounded-lg shadow-lg z-50">
          {/* 헤더 */}
          <div className="px-4 py-3 border-b border-white/15">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center">
                <span className="text-lg font-medium text-white">
                  {currentUser.username?.charAt(0).toUpperCase() || 'A'}
                </span>
              </div>
              <div>
                <div className="text-sm font-medium text-white">{currentUser.username}</div>
                <div className="text-xs text-white/50">{currentUser.email}</div>
              </div>
            </div>
          </div>

          {/* 메뉴 */}
          <div className="py-1">
            {menuItems.map((item, idx) => (
              <Link
                key={idx}
                to={item.href}
                className="flex items-center px-4 py-2 text-sm text-white/70 hover:bg-white/10"
                onClick={() => setIsOpen(false)}
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
              </Link>
            ))}
            <div className="border-t border-white/15 my-1" />
            <button
              onClick={() => { setIsOpen(false); onLogout(); }}
              className="w-full flex items-center px-4 py-2 text-sm text-white/70 hover:bg-white/10"
            >
              <span className="mr-3">🚪</span>
              로그아웃
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
